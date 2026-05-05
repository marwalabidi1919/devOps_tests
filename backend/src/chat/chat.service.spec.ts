import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { of, throwError } from 'rxjs'

import { ChatService } from './chat.service'
import { ActivitiesService } from '../activities/activities.service'
import { HttpService } from '@nestjs/axios'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFindOne   = jest.fn()
const mockHttpPost  = jest.fn()

const mockActivitiesService = { findOne: mockFindOne }
const mockHttpService       = { post: mockHttpPost }

// Activité de test
const fakeActivity = {
  _id: 'act-001',
  title: 'Formation Docker',
  description: 'Apprendre Docker',
  requiredSkills: [{ skill_name: 'Docker' }, { skill_name: 'Linux' }],
  location: 'Tunis',
  duration: '2 jours',
  startDate: new Date('2026-06-01'),
  endDate: new Date('2026-06-02'),
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ChatService', () => {
  let service: ChatService

  beforeEach(async () => {
    jest.clearAllMocks()
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OPENROUTER_STRICT

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ActivitiesService, useValue: mockActivitiesService },
        { provide: HttpService,       useValue: mockHttpService },
      ],
    }).compile()

    service = module.get<ChatService>(ChatService)
  })

  // ── processMessage ──────────────────────────────────────────────────────────

  describe('processMessage', () => {
    it('retourne une réponse valide quand Rasa répond', async () => {
      mockFindOne.mockResolvedValue(fakeActivity)
      mockHttpPost.mockReturnValue(of({
        data: [{ text: 'Bonjour, voici les infos sur la formation.' }],
      }))

      const result = await service.processMessage(
        { message: 'Bonjour', activityId: 'act-001' },
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('Bonjour')
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('lève NotFoundException si l\'activité est introuvable', async () => {
      mockFindOne.mockRejectedValue(new NotFoundException('Activity not found'))

      await expect(
        service.processMessage({ message: 'Test', activityId: 'inexistant' }),
      ).rejects.toThrow(NotFoundException)
    })

    it('lève ServiceUnavailableException si Rasa est inaccessible (ECONNREFUSED)', async () => {
      mockFindOne.mockResolvedValue(fakeActivity)
      const connError: any = new Error('connect ECONNREFUSED')
      connError.code = 'ECONNREFUSED'
      mockHttpPost.mockReturnValue(throwError(() => connError))

      await expect(
        service.processMessage({ message: 'Test', activityId: 'act-001' }),
      ).rejects.toThrow(ServiceUnavailableException)
    })

    it('retourne le message de réponse Rasa correctement assemblé', async () => {
      mockFindOne.mockResolvedValue(fakeActivity)
      mockHttpPost.mockReturnValue(of({
        data: [{ text: 'Partie 1.' }, { text: 'Partie 2.' }],
      }))

      const result = await service.processMessage(
        { message: 'Détails ?', activityId: 'act-001' },
      )

      expect(result.message).toBe('Partie 1. Partie 2.')
    })

    it('retourne un message par défaut si Rasa répond avec un tableau vide', async () => {
      mockFindOne.mockResolvedValue(fakeActivity)
      mockHttpPost.mockReturnValue(of({ data: [] }))

      const result = await service.processMessage(
        { message: 'Test', activityId: 'act-001' },
      )

      expect(result.message).toContain("Désolé")
    })
  })

  // ── enrichContext ───────────────────────────────────────────────────────────

  describe('enrichContext (via processMessage)', () => {
    it('mappe correctement les compétences requises', async () => {
      mockFindOne.mockResolvedValue(fakeActivity)
      mockHttpPost.mockImplementation((_url: string, payload: any) => {
        const competences = payload?.metadata?.activity?.competences
        expect(competences).toContain('Docker')
        expect(competences).toContain('Linux')
        return of({ data: [{ text: 'ok' }] })
      })

      await service.processMessage({ message: 'Test', activityId: 'act-001' })
    })

    it('utilise "Aucune compétence spécifiée" si requiredSkills est vide', async () => {
      mockFindOne.mockResolvedValue({ ...fakeActivity, requiredSkills: [] })
      mockHttpPost.mockImplementation((_url: string, payload: any) => {
        const competences = payload?.metadata?.activity?.competences
        expect(competences).toContain('Aucune compétence spécifiée')
        return of({ data: [{ text: 'ok' }] })
      })

      await service.processMessage({ message: 'Test', activityId: 'act-001' })
    })
  })

  // ── rewritePrompt ───────────────────────────────────────────────────────────

  describe('rewritePrompt', () => {
    it('retourne le texte original en fallback si OPENROUTER_API_KEY absent', async () => {
      const result = await service.rewritePrompt({ prompt: 'bonjour monde' })
      expect(result.rewritten).toBe('bonjour monde')
      expect(result.model).toBe('fallback')
    })

    it('lève ServiceUnavailableException si strict=true et clé absente', async () => {
      process.env.OPENROUTER_STRICT = 'true'

      await expect(
        service.rewritePrompt({ prompt: 'test' }),
      ).rejects.toThrow(ServiceUnavailableException)
    })

    it('retourne le texte reformulé si OpenRouter répond', async () => {
      process.env.OPENROUTER_API_KEY = 'fake-key'
      mockHttpPost.mockReturnValue(of({
        data: { choices: [{ message: { content: 'Texte reformulé.' } }] },
      }))

      const result = await service.rewritePrompt({ prompt: 'bonjour monde' })
      expect(result.rewritten).toBe('Texte reformulé.')
    })

    it('retourne fallback si OpenRouter échoue et strict=false', async () => {
      process.env.OPENROUTER_API_KEY = 'fake-key'
      mockHttpPost.mockReturnValue(throwError(() => new Error('timeout')))

      const result = await service.rewritePrompt({ prompt: 'mon texte' })
      expect(result.rewritten).toBe('mon texte')
      expect(result.model).toBe('fallback')
    })
  })

  // ── websiteGuide ────────────────────────────────────────────────────────────

  describe('websiteGuide', () => {
    it('retourne un fallback si OPENROUTER_API_KEY absent', async () => {
      const result = await service.websiteGuide({
        message: 'Comment créer une activité ?',
        userRole: 'HR',
        currentPath: '/hr/activities',
      })

      expect(result.reply).toBeTruthy()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('retourne la réponse OpenRouter si disponible', async () => {
      process.env.OPENROUTER_API_KEY = 'fake-key'
      mockHttpPost.mockReturnValue(of({
        data: { choices: [{ message: { content: 'Voici comment créer une activité.' } }] },
      }))

      const result = await service.websiteGuide({
        message: 'Comment créer une activité ?',
        userRole: 'HR',
        currentPath: '/hr/activities',
      })

      expect(result.reply).toContain('créer une activité')
    })

    it('retourne fallback si OpenRouter échoue', async () => {
      process.env.OPENROUTER_API_KEY = 'fake-key'
      mockHttpPost.mockReturnValue(throwError(() => new Error('network error')))

      const result = await service.websiteGuide({
        message: 'Aide',
        userRole: 'EMPLOYEE',
        currentPath: '/employee/dashboard',
      })

      expect(result.reply).toBeTruthy()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('inclut les liens de navigation du rôle EMPLOYEE dans le fallback', async () => {
      const result = await service.websiteGuide({
        message: 'Où sont mes certificats ?',
        userRole: 'EMPLOYEE',
        currentPath: '/employee/dashboard',
      })

      expect(result.reply).toContain('/employee/')
    })
  })
})
