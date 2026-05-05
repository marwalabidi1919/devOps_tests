import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

const mockFetchWithAuth = vi.hoisted(() => vi.fn())

vi.mock('../context/DataContext', () => ({
  useData: () => ({ fetchWithAuth: mockFetchWithAuth }),
}))

import EmployeeCertificates from '../pages/employee/EmployeeCertificates'

const mockWindowOpen = vi.fn()
vi.stubGlobal('open', mockWindowOpen)

const cert1 = { _id: 'c1', activityTitle: 'Formation Docker', employeeName: 'Alice', rank: 1, issueDate: '01 janvier 2026', created_at: '' }
const cert2 = { _id: 'c2', activityTitle: 'Atelier NestJS', employeeName: 'Alice', rank: 2, issueDate: '15 fevrier 2026', created_at: '' }
const fakeCerts = [cert1, cert2]

const ok = (data) => mockFetchWithAuth.mockResolvedValue({ ok: true, json: async () => data, blob: async () => new Blob(['%PDF']), headers: { get: () => null } })
const empty = () => ok([])
const fail = () => mockFetchWithAuth.mockResolvedValue({ ok: false })

describe('EmployeeCertificates', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.setItem('auth_token', 'tok') })

  it('affiche le titre Mes Certificats', async () => {
    ok(fakeCerts)
    render(React.createElement(EmployeeCertificates))
    expect(screen.getByText('Mes Certificats')).toBeTruthy()
  })

  it('affiche skeleton au demarrage', () => {
    mockFetchWithAuth.mockReturnValue(new Promise(() => {}))
    render(React.createElement(EmployeeCertificates))
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('affiche les certificats apres chargement', async () => {
    ok(fakeCerts)
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => expect(screen.getByText('Formation Docker')).toBeTruthy())
    expect(screen.getByText('Atelier NestJS')).toBeTruthy()
  })

  it('affiche le bon nombre dans le sous-titre', async () => {
    ok(fakeCerts)
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => expect(screen.getByText('2 certificats obtenus')).toBeTruthy())
  })

  it('affiche message vide si aucun certificat', async () => {
    empty()
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => expect(screen.getByText('Aucun certificat pour le moment')).toBeTruthy())
  })

  it('affiche les dates de delivrance', async () => {
    ok(fakeCerts)
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => expect(screen.getByText('D\u00e9livr\u00e9 le 01 janvier 2026')).toBeTruthy())
  })

  it('affiche les badges de rang', async () => {
    ok(fakeCerts)
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => expect(screen.getByText('#1')).toBeTruthy())
    expect(screen.getByText('#2')).toBeTruthy()
  })

  it('filtre les certificats selon la recherche', async () => {
    ok(fakeCerts)
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => screen.getByText('Formation Docker'))
    fireEvent.change(screen.getByPlaceholderText('Rechercher une activit\u00e9...'), { target: { value: 'Docker' } })
    expect(screen.getByText('Formation Docker')).toBeTruthy()
    expect(screen.queryByText('Atelier NestJS')).toBeNull()
  })

  it('affiche Aucun certificat trouv\u00e9 si recherche sans resultat', async () => {
    ok(fakeCerts)
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => screen.getByText('Formation Docker'))
    fireEvent.change(screen.getByPlaceholderText('Rechercher une activit\u00e9...'), { target: { value: 'ZZZZZ' } })
    await waitFor(() => expect(screen.getByText('Aucun certificat trouv\u00e9')).toBeTruthy())
  })

  it('recherche insensible a la casse', async () => {
    ok(fakeCerts)
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => screen.getByText('Formation Docker'))
    fireEvent.change(screen.getByPlaceholderText('Rechercher une activit\u00e9...'), { target: { value: 'docker' } })
    expect(screen.getByText('Formation Docker')).toBeTruthy()
  })

  it('affiche Portfolio PDF avec plus dun certificat', async () => {
    ok(fakeCerts)
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => expect(screen.getByText('Portfolio PDF')).toBeTruthy())
  })

  it('pas de Portfolio PDF avec un seul certificat', async () => {
    ok([cert1])
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => screen.getByText('Formation Docker'))
    expect(screen.queryByText('Portfolio PDF')).toBeNull()
  })

  it('ouvre LinkedIn au clic Partager sur LinkedIn', async () => {
    ok([cert1])
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => screen.getByText('Partager sur LinkedIn'))
    fireEvent.click(screen.getByText('Partager sur LinkedIn'))
    expect(mockWindowOpen).toHaveBeenCalledTimes(1)
    const url = mockWindowOpen.mock.calls[0][0]
    expect(url).toContain('linkedin.com/shareArticle')
  })

  it('etat vide si API retourne erreur', async () => {
    fail()
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => expect(screen.getByText('Aucun certificat pour le moment')).toBeTruthy())
  })

  it('etat vide si API retourne null', async () => {
    mockFetchWithAuth.mockResolvedValue({ ok: true, json: async () => null })
    render(React.createElement(EmployeeCertificates))
    await waitFor(() => expect(screen.getByText('Aucun certificat pour le moment')).toBeTruthy())
  })
})

