# Tests Unitaires de Ghada — MailService & ChatService

## Vue d'ensemble

| Fichier | Module | Tests |
|---|---|---|
| `backend/src/mail/mail.service.spec.ts` | MailService | 6 ✓ |
| `backend/src/chat/chat.service.spec.ts` | ChatService | 15 ✓ |

**Total : 21 tests — tous passent**

---

## 1. MailService

**Fichier :** `backend/src/mail/mail.service.spec.ts`

### Description

Teste l'envoi d'emails d'invitation aux employés. Les dépendances externes sont toutes mockées : `nodemailer` (transport SMTP), `fs/promises` (lecture du template), et `handlebars` (compilation HTML). Aucun vrai email n'est envoyé pendant les tests.

### Scénarios testés

| Test | Ce qui est vérifié |
|---|---|
| Config manquante | Lève `ServiceUnavailableException` si `MAIL_HOST`, `MAIL_USER` ou `MAIL_PASS` sont absents |
| Envoi réussi | `sendMail` est appelé une fois quand la config est complète |
| Destinataire et sujet | Le champ `to` et le `subject` contiennent les bonnes valeurs |
| Erreur SMTP | Lève `InternalServerErrorException` si le serveur SMTP refuse la connexion |
| Template introuvable | Lève `InternalServerErrorException` si le fichier `.hbs` n'existe pas |
| Compilation Handlebars | Le template est compilé avec `employeeName` et `activityTitle` corrects |

### Commande

```powershell
cd backend
npm test -- "mail.service.spec" --no-coverage --verbose
```

---

## 2. ChatService

**Fichier :** `backend/src/chat/chat.service.spec.ts`

### Description

Teste le service de chatbot qui orchestre trois fonctionnalités : la communication avec le bot Rasa, la réécriture de prompts via OpenRouter (LLM), et le guide de navigation du site. Les dépendances `ActivitiesService` et `HttpService` sont mockées — aucun appel réseau réel.

### Scénarios testés

#### `processMessage` — communication avec Rasa

| Test | Ce qui est vérifié |
|---|---|
| Réponse valide | Retourne `{ success: true, message, timestamp }` quand Rasa répond |
| Activité introuvable | Lève `NotFoundException` si l'activité n'existe pas |
| Rasa inaccessible | Lève `ServiceUnavailableException` si `ECONNREFUSED` |
| Assemblage réponse | Concatène plusieurs messages Rasa en une seule chaîne |
| Tableau vide | Retourne un message "Désolé" si Rasa répond avec `[]` |

#### `enrichContext` — enrichissement du contexte

| Test | Ce qui est vérifié |
|---|---|
| Compétences mappées | `requiredSkills` est converti en tableau de noms |
| Compétences vides | Utilise `"Aucune compétence spécifiée"` si la liste est vide |

#### `rewritePrompt` — réécriture LLM

| Test | Ce qui est vérifié |
|---|---|
| Pas de clé API | Retourne le texte original avec `model: 'fallback'` |
| Mode strict sans clé | Lève `ServiceUnavailableException` si `OPENROUTER_STRICT=true` |
| OpenRouter répond | Retourne le texte reformulé |
| OpenRouter échoue | Retourne fallback si erreur réseau et `strict=false` |

#### `websiteGuide` — guide de navigation

| Test | Ce qui est vérifié |
|---|---|
| Pas de clé API | Retourne un guide fallback avec timestamp |
| OpenRouter répond | Retourne la réponse du LLM |
| OpenRouter échoue | Retourne le fallback sans planter |
| Liens EMPLOYEE | Le fallback contient des routes `/employee/` |

### Commande

```powershell
cd backend
npm test -- "chat.service.spec" --no-coverage --verbose
```

---

## Lancer les deux suites ensemble

```powershell
cd backend
npm test -- "mail.service.spec|chat.service.spec" --no-coverage --verbose
```

## Intégration Pipeline CI

Ces tests sont automatiquement exécutés dans le pipeline Jenkins via :

```powershell
npm run test:ci
```

Stage concerné : **`Test (Backend)`** dans `Jenkinsfile.ci.back`
