import { Test, TestingModule } from '@nestjs/testing'
import { ServiceUnavailableException, InternalServerErrorException } from '@nestjs/common'
import { MailService } from './mail.service'

// ── Mock nodemailer ───────────────────────────────────────────────────────────
const mockSendMail = jest.fn()
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}))

// ── Mock fs/promises ──────────────────────────────────────────────────────────
const mockReadFile = jest.fn()
const mockAccess   = jest.fn()
jest.mock('node:fs/promises', () => ({
  readFile: (...args: any[]) => mockReadFile(...args),
  access:   (...args: any[]) => mockAccess(...args),
}))

// ── Mock handlebars ───────────────────────────────────────────────────────────
const mockCompiledTemplate = jest.fn(() => '<html>invitation</html>')
jest.mock('handlebars', () => ({
  compile: jest.fn(() => mockCompiledTemplate),
}))

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('MailService', () => {
  let service: MailService

  const validEnv = {
    MAIL_HOST: 'smtp.gmail.com',
    MAIL_USER: 'test@gmail.com',
    MAIL_PASS: 'secret',
    MAIL_FROM: 'HR <hr@company.com>',
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile()

    service = module.get<MailService>(MailService)
  })

  // ── sendEmployeeInvitation ────────────────────────────────────────────────

  describe('sendEmployeeInvitation', () => {

    it('lève ServiceUnavailableException si MAIL_HOST manquant', async () => {
      delete process.env.MAIL_HOST
      delete process.env.MAIL_USER
      delete process.env.MAIL_PASS

      await expect(
        service.sendEmployeeInvitation(
          'emp@test.com', 'Alice', 'Formation Docker',
          new Date(), 'Tunis', 'Description', 'http://accept', 'http://decline',
        ),
      ).rejects.toThrow(ServiceUnavailableException)
    })

    it('envoie un email quand la config est complète', async () => {
      process.env.MAIL_HOST = validEnv.MAIL_HOST
      process.env.MAIL_USER = validEnv.MAIL_USER
      process.env.MAIL_PASS = validEnv.MAIL_PASS
      process.env.MAIL_FROM = validEnv.MAIL_FROM

      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue('<html>{{employeeName}}</html>')
      mockSendMail.mockResolvedValue({ messageId: 'abc123' })

      await expect(
        service.sendEmployeeInvitation(
          'emp@test.com', 'Alice', 'Formation Docker',
          new Date(), 'Tunis', 'Description', 'http://accept', 'http://decline',
        ),
      ).resolves.not.toThrow()

      expect(mockSendMail).toHaveBeenCalledTimes(1)
    })

    it('envoie avec le bon destinataire et sujet', async () => {
      process.env.MAIL_HOST = validEnv.MAIL_HOST
      process.env.MAIL_USER = validEnv.MAIL_USER
      process.env.MAIL_PASS = validEnv.MAIL_PASS

      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue('<html>{{activityTitle}}</html>')
      mockSendMail.mockResolvedValue({})

      await service.sendEmployeeInvitation(
        'bob@test.com', 'Bob', 'Atelier NestJS',
        new Date(), 'Sfax', 'Desc', 'http://accept', 'http://decline',
      )

      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.to).toBe('bob@test.com')
      expect(callArgs.subject).toContain('Atelier NestJS')
    })

    it('lève InternalServerErrorException si sendMail échoue', async () => {
      process.env.MAIL_HOST = validEnv.MAIL_HOST
      process.env.MAIL_USER = validEnv.MAIL_USER
      process.env.MAIL_PASS = validEnv.MAIL_PASS

      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue('<html></html>')
      mockSendMail.mockRejectedValue(new Error('SMTP connection refused'))

      await expect(
        service.sendEmployeeInvitation(
          'emp@test.com', 'Alice', 'Formation',
          new Date(), 'Tunis', 'Desc', 'http://accept', 'http://decline',
        ),
      ).rejects.toThrow(InternalServerErrorException)
    })

    it('lève InternalServerErrorException si le template est introuvable', async () => {
      process.env.MAIL_HOST = validEnv.MAIL_HOST
      process.env.MAIL_USER = validEnv.MAIL_USER
      process.env.MAIL_PASS = validEnv.MAIL_PASS

      // Tous les chemins de template échouent
      mockAccess.mockRejectedValue(new Error('ENOENT'))

      await expect(
        service.sendEmployeeInvitation(
          'emp@test.com', 'Alice', 'Formation',
          new Date(), 'Tunis', 'Desc', 'http://accept', 'http://decline',
        ),
      ).rejects.toThrow(InternalServerErrorException)
    })

    it('compile le template handlebars avec les bonnes données', async () => {
      process.env.MAIL_HOST = validEnv.MAIL_HOST
      process.env.MAIL_USER = validEnv.MAIL_USER
      process.env.MAIL_PASS = validEnv.MAIL_PASS

      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue('<html>{{employeeName}}</html>')
      mockSendMail.mockResolvedValue({})

      await service.sendEmployeeInvitation(
        'emp@test.com', 'Charlie', 'Formation React',
        new Date('2026-06-01'), 'Tunis', 'Desc', 'http://accept', 'http://decline',
      )

      expect(mockCompiledTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeName: 'Charlie',
          activityTitle: 'Formation React',
        }),
      )
    })
  })
})
