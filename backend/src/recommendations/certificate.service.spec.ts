import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { HttpException, HttpStatus } from '@nestjs/common'
import { Types } from 'mongoose'

import { CertificateService } from './certificate.service'
import { Recommendation } from './schemas/recommendation.schema'
import { Activity } from '../activities/schemas/activity.schema'
import { User } from '../users/schemas/user.schema'
import { Certificate } from './schemas/certificate.schema'
import { NotificationsService } from '../notifications/notifications.service'

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockId = () => new Types.ObjectId().toString()

/** Crée un mock Mongoose model avec les méthodes courantes */
function createModelMock(overrides: Record<string, jest.Mock> = {}) {
  return {
    findById: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    save: jest.fn(),
    ...overrides,
  }
}

// ── Suite principale ──────────────────────────────────────────────────────────

describe('CertificateService', () => {
  let service: CertificateService

  // mocks des modèles Mongoose
  const recommendationModel = createModelMock()
  const activityModel       = createModelMock()
  const userModel           = createModelMock()
  const certificateModel    = createModelMock()

  // mock du service de notifications
  const notificationsService = { create: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        { provide: getModelToken(Recommendation.name), useValue: recommendationModel },
        { provide: getModelToken(Activity.name),       useValue: activityModel },
        { provide: getModelToken(User.name),           useValue: userModel },
        { provide: getModelToken(Certificate.name),    useValue: certificateModel },
        { provide: NotificationsService,               useValue: notificationsService },
      ],
    }).compile()

    service = module.get<CertificateService>(CertificateService)
  })

  // ── getMyCertificates ───────────────────────────────────────────────────────

  describe('getMyCertificates', () => {
    it('retourne la liste des certificats sans pdfData', async () => {
      const userId = mockId()
      const fakeCerts = [
        { _id: mockId(), activityTitle: 'Formation React', employeeName: 'Alice', rank: 1 },
      ]

      certificateModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(fakeCerts) }),
        }),
      })

      const result = await service.getMyCertificates(userId)
      expect(result).toEqual(fakeCerts)
      expect(certificateModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
      })
    })

    it('retourne un tableau vide si aucun certificat', async () => {
      certificateModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
        }),
      })

      const result = await service.getMyCertificates(mockId())
      expect(result).toEqual([])
    })
  })

  // ── downloadCertificate ─────────────────────────────────────────────────────

  describe('downloadCertificate', () => {
    it('retourne pdfData et filename pour un certificat existant', async () => {
      const certId = mockId()
      const fakeCert = {
        _id: certId,
        activityTitle: 'Formation NestJS',
        pdfData: 'data:application/pdf;base64,AAAA',
      }

      certificateModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(fakeCert) })

      const result = await service.downloadCertificate(certId, mockId())

      expect(result.pdfData).toBe(fakeCert.pdfData)
      expect(result.filename).toBe('certificat_formation_nestjs.pdf')
    })

    it('lève NOT_FOUND si le certificat est introuvable', async () => {
      certificateModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })

      await expect(service.downloadCertificate(mockId(), mockId())).rejects.toThrow(
        new HttpException('Certificat introuvable', HttpStatus.NOT_FOUND),
      )
    })
  })

  // ── markActivityCompleted ───────────────────────────────────────────────────

  describe('markActivityCompleted', () => {
    it('bascule completed de false à true', async () => {
      const activityId = mockId()
      const fakeActivity: any = { completed: false, save: jest.fn().mockResolvedValue(undefined) }

      activityModel.findById.mockResolvedValue(fakeActivity)

      const result = await service.markActivityCompleted(activityId)

      expect(fakeActivity.completed).toBe(true)
      expect(fakeActivity.save).toHaveBeenCalled()
      expect(result).toEqual({ completed: true })
    })

    it('bascule completed de true à false', async () => {
      const fakeActivity: any = { completed: true, save: jest.fn().mockResolvedValue(undefined) }
      activityModel.findById.mockResolvedValue(fakeActivity)

      const result = await service.markActivityCompleted(mockId())
      expect(result).toEqual({ completed: false })
    })

    it('lève NOT_FOUND si activité introuvable', async () => {
      activityModel.findById.mockResolvedValue(null)

      await expect(service.markActivityCompleted(mockId())).rejects.toThrow(
        new HttpException('Activité introuvable', HttpStatus.NOT_FOUND),
      )
    })
  })

  // ── setPresence ─────────────────────────────────────────────────────────────

  describe('setPresence', () => {
    it('met à jour la présence à true', async () => {
      const fakeRec: any = { presence: false, save: jest.fn().mockResolvedValue(undefined) }
      recommendationModel.findById.mockResolvedValue(fakeRec)

      const result = await service.setPresence(mockId(), true)

      expect(fakeRec.presence).toBe(true)
      expect(result).toEqual({ presence: true })
    })

    it('met à jour la présence à false', async () => {
      const fakeRec: any = { presence: true, save: jest.fn().mockResolvedValue(undefined) }
      recommendationModel.findById.mockResolvedValue(fakeRec)

      const result = await service.setPresence(mockId(), false)
      expect(result).toEqual({ presence: false })
    })

    it('lève NOT_FOUND si recommandation introuvable', async () => {
      recommendationModel.findById.mockResolvedValue(null)

      await expect(service.setPresence(mockId(), true)).rejects.toThrow(
        new HttpException('Recommandation introuvable', HttpStatus.NOT_FOUND),
      )
    })
  })

  // ── buildPortfolio ──────────────────────────────────────────────────────────

  describe('buildPortfolio', () => {
    it('lève NOT_FOUND si aucun certificat disponible', async () => {
      certificateModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      })

      await expect(service.buildPortfolio(mockId())).rejects.toThrow(
        new HttpException('Aucun certificat disponible', HttpStatus.NOT_FOUND),
      )
    })
  })

  // ── generateForActivity ─────────────────────────────────────────────────────

  describe('generateForActivity', () => {
    it('lève NOT_FOUND si activité introuvable', async () => {
      activityModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })

      await expect(service.generateForActivity(mockId(), mockId())).rejects.toThrow(
        new HttpException('Activité introuvable', HttpStatus.NOT_FOUND),
      )
    })

    it('lève BAD_REQUEST si activité non terminée', async () => {
      activityModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: mockId(), title: 'Test', completed: false }),
      })

      await expect(service.generateForActivity(mockId(), mockId())).rejects.toThrow(
        new HttpException(
          "L'activité doit être marquée comme terminée avant de générer les certificats.",
          HttpStatus.BAD_REQUEST,
        ),
      )
    })

    it('lève BAD_REQUEST si aucun employé présent', async () => {
      activityModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: mockId(), title: 'Test', completed: true }),
      })
      recommendationModel.countDocuments.mockResolvedValue(0)

      await expect(service.generateForActivity(mockId(), mockId())).rejects.toThrow(
        new HttpException(
          'Aucun employé marqué comme présent. Cochez la présence avant de générer les certificats.',
          HttpStatus.BAD_REQUEST,
        ),
      )
    })

    it('lève BAD_REQUEST si aucune recommandation éligible', async () => {
      activityModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: mockId(), title: 'Test', completed: true }),
      })
      recommendationModel.countDocuments.mockResolvedValue(2)
      recommendationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      })

      await expect(service.generateForActivity(mockId(), mockId())).rejects.toThrow(
        new HttpException(
          "Aucune recommandation trouvée pour cette activité. Lancez d'abord l'analyse IA.",
          HttpStatus.BAD_REQUEST,
        ),
      )
    })

    it('génère les certificats et retourne le count', async () => {
      const activityId = mockId()
      const userId     = mockId()

      activityModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: activityId,
          title: 'Formation Docker',
          type: 'formation',
          completed: true,
        }),
      })
      recommendationModel.countDocuments.mockResolvedValue(1)
      recommendationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: mockId(), userId, activityId, rank: 1, status: 'ACCEPTED', presence: true },
          ]),
        }),
      })
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: userId, name: 'Bob Martin' }),
      })
      certificateModel.findOneAndUpdate.mockResolvedValue({ _id: mockId() })
      notificationsService.create.mockResolvedValue(undefined)

      const result = await service.generateForActivity(activityId, mockId())

      expect(result.count).toBe(1)
      expect(certificateModel.findOneAndUpdate).toHaveBeenCalledTimes(1)
      expect(notificationsService.create).toHaveBeenCalledTimes(1)
    })

    it('ignore un employé introuvable et continue', async () => {
      const activityId = mockId()

      activityModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: activityId, title: 'Test', type: 'atelier', completed: true,
        }),
      })
      recommendationModel.countDocuments.mockResolvedValue(1)
      recommendationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: mockId(), userId: mockId(), activityId, rank: 1, status: 'ACCEPTED', presence: true },
          ]),
        }),
      })
      // user introuvable → null
      userModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })

      const result = await service.generateForActivity(activityId, mockId())
      expect(result.count).toBe(0)
      expect(certificateModel.findOneAndUpdate).not.toHaveBeenCalled()
    })
  })
})
