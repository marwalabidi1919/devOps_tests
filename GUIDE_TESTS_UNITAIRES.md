# Guide Tests Unitaires — SkillUpTN

## Vue d'ensemble

| Fichier | Module | Framework | Tests |
|---|---|---|---|
| `backend/src/recommendations/certificate.service.spec.ts` | CertificateService | Jest | 17 ✓ |
| `backend/src/notifications/notifications.service.spec.ts` | NotificationsService | Jest | 15 ✓ |
| `frontend/src/test/EmployeeCertificates.test.tsx` | EmployeeCertificates | Vitest | 15 ✓ |

**Total : 47 tests — tous passent**

---

## 1. CertificateService (Backend)

**Fichier :** `backend/src/recommendations/certificate.service.spec.ts`

**Description :** Teste la génération, le téléchargement et la gestion des certificats de participation. Tous les modèles Mongoose et le service de notifications sont mockés.

| Méthode | Scénarios testés |
|---|---|
| `getMyCertificates` | retourne la liste sans pdfData, retourne `[]` si vide |
| `downloadCertificate` | retourne pdfData + filename, lève NOT_FOUND si introuvable |
| `markActivityCompleted` | toggle false→true, toggle true→false, NOT_FOUND |
| `setPresence` | présence true, présence false, NOT_FOUND |
| `buildPortfolio` | NOT_FOUND si aucun certificat |
| `generateForActivity` | NOT_FOUND activité, BAD_REQUEST (non terminée / 0 présents / 0 recs), succès avec count, employé introuvable ignoré |

**Commande :**
```powershell
cd backend
npm test -- "certificate.service.spec" --no-coverage --verbose
```

---

## 2. NotificationsService (Backend)

**Fichier :** `backend/src/notifications/notifications.service.spec.ts`

**Description :** Teste la création, la lecture et la gestion des notifications. Le modèle Mongoose et le gateway WebSocket sont mockés — aucune connexion réelle.

| Méthode | Scénarios testés |
|---|---|
| `create` | bons champs sauvegardés, WebSocket émis, data stockée, résistance erreur socket |
| `getForUser` | retourne la liste triée, retourne `[]` si vide |
| `markAsRead` | appelle updateOne avec `read: true`, bon ObjectId |
| `markAllAsRead` | filtre uniquement `read: false` |
| `getUnreadCount` | retourne le count, retourne 0, filtre `read: false` |
| `deleteForUser` | suppression avec `_id` + `userId` |
| `notifyHRRecommendationReady` | type RECOMMENDATION_GENERATED, événement gateway |

**Commande :**
```powershell
cd backend
npm test -- "notifications.service.spec" --no-coverage --verbose
```

---

## 3. EmployeeCertificates (Frontend)

**Fichier :** `frontend/src/test/EmployeeCertificates.test.tsx`

**Description :** Teste le composant React de la page certificats employé. Le contexte DataContext et les appels API sont mockés avec Vitest.

| Groupe | Scénarios testés |
|---|---|
| Affichage | titre, skeleton de chargement, liste des certificats, sous-titre compteur |
| État vide | aucun certificat, erreur API, réponse null |
| Données | dates de délivrance, badges de rang |
| Recherche | filtre par titre, aucun résultat, insensible à la casse |
| Portfolio PDF | bouton présent si > 1 certificat, absent si 1 seul |
| LinkedIn | ouvre la bonne URL au clic |

**Commande :**
```powershell
cd frontend
npm test -- src/test/EmployeeCertificates.test.tsx --reporter=verbose
```

---

## Lancer tous les tests

**Tous les tests backend :**
```powershell
cd backend
npm test -- --no-coverage --verbose
```

**Tous les tests frontend :**
```powershell
cd frontend
npm test
```

**Avec couverture de code (pipeline CI) :**
```powershell
# Backend
cd backend
npm run test:ci

# Frontend
cd frontend
npm run test:ci
```

---

## Intégration Pipeline CI/CD

Les tests sont automatiquement exécutés dans les pipelines Jenkins :

- **`Jenkinsfile.ci.back`** → stage `Test (Backend)` → `npm run test:ci`
- **`Jenkinsfile.ci.front`** → stage `Test (Frontend)` → `npm run test:ci`

Aucune modification des Jenkinsfiles n'est nécessaire.
