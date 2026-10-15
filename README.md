# La Teglieria — frontend Vercel con backend unico

Candidato riservato: Vercel ospita il frontend; il backend DEMO sul server conserva ordini, scorte, account, prezzi e integrazioni Stripe/Google. Nessun database Supabase parallelo. Le chiavi Stripe e Google OAuth restano sul server.

Configurare le variabili server indicate in `.env.example`. `UNIFIED_WEB_GATEWAY_KEY` è una chiave dedicata al solo ingresso web DEMO e `UNIFIED_PREVIEW_AUTH` contiene il record scrypt della password già scelta. Non inserirle nel repository. Su Vercel, senza modalità e credenziali private valide, l'app risponde 503. Tutte le pagine, API e risorse sono protette; soltanto POST esatto /api/stripe/webhook è esente dalla password e richiede comunque firma Stripe valida al backend.

Il gateway HTTPS usa Tailscale Funnel, richiede una chiave su ogni richiesta e ammette solo /web/api/ e /web/media/. Il server nativo e la produzione non sono pubblicati. Backend non raggiungibile: il sito rifiuta nuove operazioni e non registra ordini localmente.

Prima del collaudo remoto abilitare Funnel nel pannello Tailscale e configurare Vercel. Per Google e Stripe, il dominio di ritorno del backend deve corrispondere al dominio effettivo del test. Non promuovere su lateglieria.it finché password, gateway, collegamenti e ripristino non sono verificati. La pubblicazione privata sul dominio rimane distinta dallo sblocco ai clienti. Le condizioni del piano commerciale restano a carico del titolare.

Non abilitati cron Vercel del vecchio sito, portale/tracciamento rider o servizi email non configurati. DDT e dispositivi fiscali rimangono gestiti dal gestionale. Il passaggio operativo richiede backup, configurazioni reali e collaudi già previsti; non sostituire il DB operativo con il DB DEMO.
