import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { Types } from 'mongoose'

import { NotificationsService } from './notifications.service'
import { Notification } from './schemas/notification.schema'
import { NotificationGateway } from './notification.gateway'
import { NotificationType } from './schemas/notification.schema'

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockId = () => new Types.ObjectId().toString()

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSave = jest.fn().mockResolvedValue(undefined)

/** Simule un document Mongoose retourné par `new Model(...)` */
function makeDoc(overrides: Record<string, any> = {}) {
  return {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    type: NotificationType.CERTIFICATE_ISSUED,
    title: 'Test',
    message: 'Message test',
    read: false,
    created_at: new Date(),
    save: mockSave,
    toObject: jest.fn().mockReturnValue({ ...overrides }),
    ...overrides,
  }
}

// Mock constructor du modèle Mongoose
const mockNotificationModel: any = jest.fn().mockImplementation((data: any) => makeDoc(data))
mockNotificationModel.find        = jest.fn()
mockNotificationModel.updateOne   = jest.fn()
mockNotificationModel.updateMany  = jest.fn()
mockNotificationModel.deleteOne   = jest.fn()
mockNotificationModel.countDocuments = jest.fn()

// Mock du gateway WebSocket
const mockGateway = { sendToUser: jest.fn() }

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('NotificationsService', () => {
  let service: NotificationsService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getModelToken(Notification.name), useValue: mockNotificationModel },
        { provide: NotificationGateway,              useValue: mockGateway },
      ],
    }).compile()

    service = module.get<NotificationsService>(NotificationsService)
  })

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('crée une notification avec les bons champs', async () => {
      const userId = mockId()
      const input = {
        userId,
        type: NotificationType.CERTIFICATE_ISSUED,
        title: '🎓 Certificat de participation',
        message: 'Votre certificat est disponible.',
        data: { activityId: mockId() },
      }

      const doc = await service.create(input)

      expect(mockSave).toHaveBeenCalledTimes(1)
      expect(doc.title).toBe(input.title)
      expect(doc.message).toBe(input.message)
      expect(doc.type).toBe(input.type)
    })

    it('envoie un événement WebSocket après création', async () => {
      const userId = mockId()
      await service.create({
        userId,
        type: NotificationType.EMPLOYEE_NOTIFIED,
        title: 'Invitation',
        message: 'Vous êtes sélectionné(e)',
      })

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        userId,
        'notification_created',
        expect.any(Object),
      )
    })

    it('stocke le champ data quand il est fourni', async () => {
      const activityId = mockId()
      const doc = await service.create({
        userId: mockId(),
        type: NotificationType.RECOMMENDATION_GENERATED,
        title: 'Recommandations prêtes',
        message: '3 employés recommandés',
        data: { activityId },
      })

      // Le constructeur du modèle a bien reçu data
      expect(mockNotificationModel).toHaveBeenCalledWith(
        expect.objectContaining({ data: { activityId } }),
      )
    })

    it('ne plante pas si le gateway échoue', async () => {
      mockGateway.sendToUser.mockImplementationOnce(() => { throw new Error('socket error') })

      await expect(
        service.create({
          userId: mockId(),
          type: NotificationType.CERTIFICATE_ISSUED,
          title: 'Test',
          message: 'Test',
        }),
      ).resolves.not.toThrow()
    })
  })

  // ── getForUser ───────────────────────────────────────────────────────────────

  describe('getForUser', () => {
    it('retourne les notifications triées pour un utilisateur', async () => {
      const userId = mockId()
      const fakeNotifs = [
        makeDoc({ title: 'Notif 1', read: false }),
        makeDoc({ title: 'Notif 2', read: true }),
      ]

      mockNotificationModel.find.mockReturnValue({
        sort:  jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean:  jest.fn().mockReturnThis(),
        exec:  jest.fn().mockResolvedValue(fakeNotifs),
      })

      const result = await service.getForUser(userId)

      expect(result).toEqual(fakeNotifs)
      expect(mockNotificationModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
      })
    })

    it('retourne un tableau vide si aucune notification', async () => {
      mockNotificationModel.find.mockReturnValue({
        sort:  jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean:  jest.fn().mockReturnThis(),
        exec:  jest.fn().mockResolvedValue([]),
      })

      const result = await service.getForUser(mockId())
      expect(result).toEqual([])
    })
  })

  // ── markAsRead ───────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('marque une notification comme lue', async () => {
      const notifId = mockId()
      mockNotificationModel.updateOne.mockResolvedValue({ modifiedCount: 1 })

      await service.markAsRead(notifId)

      expect(mockNotificationModel.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Types.ObjectId) },
        { $set: { read: true } },
      )
    })

    it('appelle updateOne avec le bon ObjectId', async () => {
      const notifId = new Types.ObjectId().toString()
      mockNotificationModel.updateOne.mockResolvedValue({})

      await service.markAsRead(notifId)

      const callArg = mockNotificationModel.updateOne.mock.calls[0][0]
      expect(callArg._id.toString()).toBe(notifId)
    })
  })

  // ── markAllAsRead ─────────────────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('marque toutes les notifications non lues comme lues', async () => {
      const userId = mockId()
      mockNotificationModel.updateMany.mockResolvedValue({ modifiedCount: 3 })

      await service.markAllAsRead(userId)

      expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
        { userId: expect.any(Types.ObjectId), read: false },
        { $set: { read: true } },
      )
    })
  })

  // ── getUnreadCount ────────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('retourne le nombre de notifications non lues', async () => {
      mockNotificationModel.countDocuments.mockResolvedValue(5)

      const count = await service.getUnreadCount(mockId())
      expect(count).toBe(5)
    })

    it('retourne 0 si aucune notification non lue', async () => {
      mockNotificationModel.countDocuments.mockResolvedValue(0)

      const count = await service.getUnreadCount(mockId())
      expect(count).toBe(0)
    })

    it('filtre uniquement les notifications non lues (read: false)', async () => {
      mockNotificationModel.countDocuments.mockResolvedValue(2)
      const userId = mockId()

      await service.getUnreadCount(userId)

      expect(mockNotificationModel.countDocuments).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        read: false,
      })
    })
  })

  // ── deleteForUser ─────────────────────────────────────────────────────────────

  describe('deleteForUser', () => {
    it('supprime la notification de l\'utilisateur', async () => {
      const notifId = mockId()
      const userId  = mockId()
      mockNotificationModel.deleteOne.mockResolvedValue({ deletedCount: 1 })

      await service.deleteForUser(notifId, userId)

      expect(mockNotificationModel.deleteOne).toHaveBeenCalledWith({
        _id:    expect.any(Types.ObjectId),
        userId: expect.any(Types.ObjectId),
      })
    })
  })

  // ── notifyHRRecommendationReady ───────────────────────────────────────────────

  describe('notifyHRRecommendationReady', () => {
    it('crée une notification de type RECOMMENDATION_GENERATED', async () => {
      const hrId = mockId()
      await service.notifyHRRecommendationReady(hrId, mockId(), 'Formation Docker', 3)

      expect(mockNotificationModel).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.RECOMMENDATION_GENERATED }),
      )
    })

    it('envoie un événement recommendation_ready via gateway', async () => {
      const hrId = mockId()
      await service.notifyHRRecommendationReady(hrId, mockId(), 'Formation Docker', 3)

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        hrId,
        'recommendation_ready',
        expect.objectContaining({ count: 3 }),
      )
    })
  })
})
