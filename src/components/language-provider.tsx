import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

export type Language = "en" | "fr"

const STORAGE_KEY = "pos.language"

const french: Record<string, string> = {
  "Loading more…": "Chargement de la suite…",
  "Could not load more items.": "Impossible de charger la suite.",
  "Load more": "Charger la suite",
  "You’re all caught up": "Vous avez tout vu",
  Filters: "Filtres",
  "Show results": "Afficher les résultats",
  Back: "Retour",
  "Kitchen stages": "Étapes en cuisine",
  "Workspace navigation": "Navigation de l’espace de travail",
  "Platform navigation": "Navigation de la plateforme",
  "Could not load sales digest.": "Impossible de charger le résumé des ventes.",
  "Open sales digest": "Ouvrir le résumé des ventes",
  "Review today's sales and email yesterday's digest.":
    "Consultez les ventes du jour et envoyez le résumé d’hier par e-mail.",
  "Previous cards": "Cartes précédentes",
  "Next cards": "Cartes suivantes",
  "View order": "Voir la commande",
  "Order notes": "Notes de commande",
  "This order is no longer active": "Cette commande n’est plus active",
  "It may have been completed or cancelled. Check order history for its latest details.":
    "Elle a peut-être été terminée ou annulée. Consultez l’historique pour connaître son état actuel.",
  Overview: "Vue d’ensemble",
  Orders: "Commandes",
  orders: "commandes",
  Kitchen: "Cuisine",
  Performance: "Performance",
  Inventory: "Stock",
  Menu: "Carte",
  "Shift & cash": "Service et caisse",
  Team: "Équipe",
  Customers: "Clients",
  Settings: "Paramètres",
  Preferences: "Préférences",
  "Main navigation": "Navigation principale",
  "More navigation": "Autres sections",
  "Your workspace": "Votre espace de travail",
  "Tools for your role, all in one place.":
    "Les outils de votre rôle, réunis au même endroit.",
  "Workspace home": "Accueil de l’espace de travail",
  "Your account": "Votre compte",
  "Open your profile": "Ouvrir votre profil",
  "Your profile and workspace preferences.":
    "Votre profil et les préférences de votre espace de travail.",
  "Language & preferences": "Langue et préférences",
  Appearance: "Apparence",
  Light: "Clair",
  Dark: "Sombre",
  More: "Plus",
  Sell: "Vendre",
  History: "Historique",
  Language: "Langue",
  Close: "Fermer",
  "Close settings": "Fermer les paramètres",
  "Restaurant settings": "Paramètres du restaurant",
  "The logo appears on receipts, the sign-in screen, and the sidebar.":
    "Le logo apparaît sur les reçus, l’écran de connexion et le menu latéral.",
  Logo: "Logo",
  "JPEG, PNG, or WebP. Shown wherever the restaurant is identified.":
    "JPEG, PNG ou WebP. Affiché partout où le restaurant est identifié.",
  "Could not load restaurant details.":
    "Impossible de charger les détails du restaurant.",
  "Use JPEG, PNG, or WebP.": "Utilisez un fichier JPEG, PNG ou WebP.",
  "Could not upload logo.": "Impossible de téléverser le logo.",
  "Uploading…": "Téléversement…",
  "Verifying…": "Vérification…",
  Change: "Modifier",
  "Only managers and owners can change branding.":
    "Seuls les responsables et les propriétaires peuvent modifier l’identité visuelle.",
  "Logo verified and live.": "Logo vérifié et publié.",
  "The name staff and guests see for this restaurant.":
    "Le nom du restaurant visible par l’équipe et les clients.",
  "Sign-in code": "Code de connexion",
  "Staff enter this code before choosing their name.":
    "L’équipe saisit ce code avant de choisir son nom.",
  "Currency and timezone": "Devise et fuseau horaire",
  "Prices are stored in pesewas and dated in the restaurant timezone.":
    "Les prix sont enregistrés en pesewas et les dates utilisent le fuseau horaire du restaurant.",
  "Sales digest email": "E-mail du résumé des ventes",
  "Yesterday's rollup is emailed here each morning after 05:15.":
    "Le récapitulatif de la veille est envoyé ici chaque matin après 5 h 15.",
  "Digest email saved.": "Adresse e-mail du résumé enregistrée.",
  "Could not save the digest email.":
    "Impossible d’enregistrer l’adresse e-mail du résumé.",
  "Saving…": "Enregistrement…",
  Save: "Enregistrer",
  "Ovaal is billed through Paystack. This is the plan on the restaurant, the last payment, and the next due date.":
    "L’abonnement Ovaal est facturé par Paystack. Consultez la formule du restaurant, le dernier paiement et la prochaine échéance.",
  "Mobile money contacts, and the Paystack account MoMo collections settle into.":
    "Contacts Mobile Money et compte Paystack sur lequel sont versés les paiements MoMo.",
  "Mobile money contacts": "Contacts Mobile Money",
  "Saved numbers across MTN, AirtelTigo and Telecel.":
    "Numéros enregistrés pour MTN, AirtelTigo et Telecel.",
  "Current plan": "Formule actuelle",
  "Not subscribed": "Aucun abonnement",
  "Choose a plan below to start billing.":
    "Choisissez une formule ci-dessous pour commencer la facturation.",
  None: "Aucun",
  "Past due": "En retard",
  "Last paid": "Dernier paiement",
  "Next payment": "Prochain paiement",
  "Choose a plan": "Choisir une formule",
  "Paystack charges this amount on the billing email below.":
    "Paystack facture ce montant à l’adresse e-mail de facturation ci-dessous.",
  "Billing email": "E-mail de facturation",
  "Opening Paystack…": "Ouverture de Paystack…",
  "Pay with Paystack": "Payer avec Paystack",
  month: "mois",
  quarter: "trimestre",
  year: "an",
  "Payment received. Your subscription is active.":
    "Paiement reçu. Votre abonnement est actif.",
  "Paystack has not confirmed this payment yet.":
    "Paystack n’a pas encore confirmé ce paiement.",
  "Only managers and owners can edit payout numbers.":
    "Seuls les responsables et les propriétaires peuvent modifier les numéros de versement.",
  Network: "Réseau",
  "Account name": "Nom du compte",
  "Mobile number": "Numéro mobile",
  "Add number": "Ajouter un numéro",
  "Saved mobile money contacts across MTN, AirtelTigo and Telecel. Configure the payment destination in Paystack settlement.":
    "Contacts Mobile Money enregistrés pour MTN, AirtelTigo et Telecel. Configurez le compte de destination dans les paramètres Paystack.",
  "Paystack account": "Compte Paystack",
  "Mobile money is charged on this restaurant's own Paystack account. Subaccounts are not used.":
    "Les paiements Mobile Money passent par le compte Paystack de ce restaurant. Aucun sous-compte n’est utilisé.",
  "Paystack secret key": "Clé secrète Paystack",
  "Checking Paystack…": "Vérification de Paystack…",
  "Connect account": "Connecter le compte",
  "Paystack account connected.": "Compte Paystack connecté.",
  "Could not connect that Paystack account":
    "Impossible de connecter ce compte Paystack",
  Connected: "Connecté",
  "key ending": "clé se terminant par",
  Collections: "Encaissements",
  "Couldn’t load the subscription.": "Impossible de charger l’abonnement.",
  "No subscription tiers are available yet.":
    "Aucune formule d’abonnement disponible pour le moment.",
  "Contact your platform administrator to configure a subscription tier.":
    "Contactez l’administrateur de la plateforme pour configurer une formule.",
  "Could not load payout numbers.":
    "Impossible de charger les numéros de versement.",
  "No payout numbers yet.": "Aucun numéro de versement pour le moment.",
  "Add a mobile money contact using the form above. Payment settlement is managed separately in Paystack settlement.":
    "Ajoutez un contact Mobile Money avec le formulaire ci-dessus. Le compte de versement se gère séparément dans Paystack.",
  "Could not load the Paystack account":
    "Impossible de charger le compte Paystack",
  "Choose how the workspace appears for you on this device.":
    "Choisissez l’affichage de votre espace de travail sur cet appareil.",
  "Choose the language for menus and workspace controls.":
    "Choisissez la langue des menus et des commandes de l’espace de travail.",
  General: "Général",
  Manage: "Gestion",
  Cashier: "Caissier",
  Manager: "Responsable",
  Owner: "Propriétaire",
  "Point of Sale": "Point de vente",
  "Expand sidebar": "Développer le menu latéral",
  "Collapse sidebar": "Réduire le menu latéral",
  Notifications: "Notifications",
  "Mark all as read": "Tout marquer comme lu",
  All: "Tout",
  Inbox: "Non lues",
  Archived: "Archivées",
  "Nothing in this tab. Low stock, large voids, cash variance, payment failures, and offline conflicts show up here.":
    "Aucune notification ici. Les stocks bas, annulations importantes, écarts de caisse, échecs de paiement et conflits de synchronisation apparaissent ici.",
  "Open profile menu": "Ouvrir le menu du profil",
  "Profile actions": "Actions du profil",
  "Open operations account menu": "Ouvrir le menu du compte opérations",
  "Light mode": "Mode clair",
  "Dark mode": "Mode sombre",
  "Log out": "Se déconnecter",
  Restaurants: "Restaurants",
  Restaurant: "Restaurant",
  Metrics: "Indicateurs",
  "Pilot health": "Santé des pilotes",
  Subscriptions: "Abonnements",
  Subscription: "Abonnement",
  Payouts: "Versements",
  "Audit log": "Journal d’audit",
  Directory: "Répertoire",
  Insights: "Analyses",
  Records: "Historique",
  Platform: "Plateforme",
  Operations: "Opérations",
  Search: "Rechercher",
  "Search…": "Rechercher…",
  "No results found.": "Aucun résultat.",
  "First page": "Première page",
  "Previous page": "Page précédente",
  "Next page": "Page suivante",
  "Last page": "Dernière page",
  "Table view": "Vue tableau",
  "Grid view": "Vue grille",
  Previous: "Précédent",
  Next: "Suivant",
  "Rows per page": "Lignes par page",
  "Unable to load results": "Impossible de charger les résultats",
  "Loading results…": "Chargement des résultats…",
  Loading: "Chargement",
  "Check again": "Vérifier à nouveau",
  "Try again": "Réessayer",
  "Trying again…": "Nouvel essai…",
  "Try again to load the latest data.":
    "Réessayez pour charger les dernières données.",
  "Good morning": "Bonjour",
  "Good afternoon": "Bon après-midi",
  "Good evening": "Bonsoir",
  "Here's what's happening in your restaurant right now.":
    "Voici ce qui se passe dans votre restaurant en ce moment.",
  "Search orders": "Rechercher des commandes",
  "Every ticket from the counter. Open a row to see what was ordered and how it was paid, or view its digital receipt.":
    "Chaque ticket de caisse. Ouvrez une ligne pour voir la commande et son paiement, ou consultez son reçu numérique.",
  "Search tickets, meals, or notes":
    "Rechercher un ticket, un plat ou une note",
  "Filter by status": "Filtrer par statut",
  "Filter by creator": "Filtrer par membre de l’équipe",
  "All statuses": "Tous les statuts",
  "All staff": "Toute l’équipe",
  "Created at": "Créée le",
  "Created by": "Créée par",
  "Orders could not be loaded.": "Impossible de charger les commandes.",
  "No orders on this page.": "Aucune commande sur cette page.",
  "No orders match these filters.":
    "Aucune commande ne correspond à ces filtres.",
  "No orders yet.": "Aucune commande pour le moment.",
  "Try another ticket, status, staff member, or date range.":
    "Essayez un autre ticket, statut, membre de l’équipe ou intervalle de dates.",
  "Tickets will appear here after they are placed.":
    "Les tickets apparaîtront ici après la prise de commande.",
  "View newest orders": "Voir les dernières commandes",
  "Close order": "Fermer la commande",
  "Delivery address": "Adresse de livraison",
  Subtotal: "Sous-total",
  Comp: "Offert",
  Discount: "Remise",
  "Kitchen tip": "Pourboire cuisine",
  "No payment due": "Aucun paiement dû",
  "View digital receipt": "Voir le reçu numérique",
  Shifts: "Services",
  Shift: "Service",
  Started: "Ouvert",
  Ended: "Fermé",
  "Still open": "Encore ouvert",
  "Shift details": "Détails du service",
  "Close dialog": "Fermer la fenêtre",
  "Every register sitting in the range. Open one to see its orders and revenue.":
    "Chaque service de caisse sur la période. Ouvrez-en un pour voir ses commandes et ses revenus.",
  "Search shifts": "Rechercher des services",
  Closed: "Fermé",
  Open: "Ouvert",
  Revenue: "Revenus",
  "No shifts match your search.":
    "Aucun service ne correspond à votre recherche.",
  "Try another date or status.": "Essayez une autre date ou un autre statut.",
  "Could not load shifts.": "Impossible de charger les services.",
  "No shifts in this range.": "Aucun service sur cette période.",
  "Choose a different date range to review previous shifts.":
    "Choisissez une autre période pour consulter les services précédents.",
  "Reset date range": "Réinitialiser la période",
  "Shift orders": "Commandes du service",
  "Search shift orders": "Rechercher dans les commandes du service",
  When: "Date",
  Paid: "Payé",
  Active: "Actif",
  Inactive: "Inactif",
  Suspended: "Suspendu",
  Allowed: "Autorisé",
  Stopped: "Arrêté",
  Pending: "En attente",
  Paused: "En pause",
  Expired: "Expiré",
  Balanced: "Équilibré",
  "Variance flagged": "Écart signalé",
  "No orders match your search.":
    "Aucune commande ne correspond à votre recherche.",
  "Try another ticket or status.": "Essayez un autre ticket ou statut.",
  "No orders on this shift.": "Aucune commande pour ce service.",
  "This shift has no recorded orders.":
    "Ce service ne comporte aucune commande enregistrée.",
  "Average ticket": "Ticket moyen",
  "Opening float": "Fond de caisse initial",
  "By payment method": "Par moyen de paiement",
  "By dining": "Par type de service",
  "Sales and operations for the selected dates, updated every minute.":
    "Ventes et opérations pour les dates sélectionnées, actualisées chaque minute.",
  "Contact details, order history, and order-ready message status.":
    "Coordonnées, historique des commandes et statut des messages de commande prête.",
  "Open the register, watch the current shift, and reconcile the cash drawer when you close.":
    "Ouvrez la caisse, suivez le service et rapprochez les espèces à la fermeture.",
  "Track what came in, what was used, and what remains. Orders reserve stock; preparation consumes it.":
    "Suivez les entrées, les utilisations et le stock restant. Les commandes réservent le stock ; la préparation le consomme.",
  "Add stock item": "Ajouter un article en stock",
  "Inventory sections": "Sections du stock",
  Stock: "Stock",
  "Meal recipes": "Recettes des plats",
  "Movement log": "Journal des mouvements",
  "Stock balance": "Solde du stock",
  "Count review required": "Comptage à vérifier",
  "Low stock": "Stock bas",
  "In stock": "En stock",
  "Available now": "Disponible maintenant",
  Available: "Disponible",
  Reserved: "Réservé",
  "Reorder point": "Seuil de réapprovisionnement",
  "Physical count needs review": "Le comptage physique doit être vérifié",
  of: "sur",
  "on hand": "en stock",
  "above reorder point": "au-dessus du seuil",
  "below reorder point": "en dessous du seuil",
  Receive: "Réceptionner",
  Waste: "Perte",
  Count: "Compter",
  "Movement history": "Historique des mouvements",
  "Inventory movement history": "Historique des mouvements de stock",
  "When / who": "Date / auteur",
  "Stock / action": "Stock / action",
  Quantity: "Quantité",
  "On-hand change": "Variation du stock",
  "Reserved change": "Variation des réservations",
  "Reference / explanation": "Référence / explication",
  "Analytics categories": "Catégories d’analyse",
  Staff: "Personnel",
  Taxes: "Taxes",
  "Choose your business profile. Tax is calculated automatically on new orders.":
    "Choisissez le profil de votre entreprise. La taxe est calculée automatiquement sur les nouvelles commandes.",
  Discounts: "Remises",
  "Create a draft, reveal the ticket, then activate it for the cashier.":
    "Créez un brouillon, affichez le ticket, puis activez-le pour la caisse.",
  "Add the people who use this till. Each person chooses a PIN the first time they sign in.":
    "Ajoutez les personnes qui utilisent cette caisse. Chacune choisit un code PIN lors de sa première connexion.",
  "Build categories, items, modifier choices, and availability.":
    "Créez des catégories, des articles, des options et gérez leur disponibilité.",
  Counter: "Caisse",
  "Build the bag, then take cash or send a MoMo prompt.":
    "Préparez le panier, puis encaissez en espèces ou envoyez une demande MoMo.",
  Bag: "Panier",
  "Live orders": "Commandes en direct",
  "Live kitchen": "Cuisine en direct",
  "Order status": "Statut des commandes",
  "Kitchen display": "Écran de cuisine",
  "See each ticket move from new, to preparing, to ready.":
    "Suivez chaque ticket, de nouveau à en préparation puis prêt.",
  "Track incoming orders in real time and move every ticket through a clear, one-way cooking flow.":
    "Suivez les commandes entrantes en temps réel et faites avancer chaque ticket dans les étapes de préparation.",
  "Add new staff": "Ajouter un membre du personnel",
  "Search staff by name": "Rechercher un membre du personnel",
  "Filter by role": "Filtrer par rôle",
  "All roles": "Tous les rôles",
  Name: "Nom",
  Role: "Rôle",
  Actions: "Actions",
  "Manage custom tax rates": "Gérer les taux de taxe personnalisés",
  "Create tax": "Créer une taxe",
  Rate: "Taux",
  Applied: "Application",
  "Create discount": "Créer une remise",
  Schedule: "Période",
  Value: "Valeur",
  Code: "Code",
  Uses: "Utilisations",
  "Search tax rates": "Rechercher des taux de taxe",
  "Search discounts": "Rechercher des remises",
  Cash: "Espèces",
  "Mobile money": "Argent mobile",
  Transfer: "Virement",
  Refund: "Remboursement",
  " (included)": " (incluse)",
  "Filter by date range": "Filtrer par intervalle de dates",
  "Select a range": "Choisir un intervalle",
  "Clear date filter": "Effacer le filtre de dates",
  Today: "Aujourd’hui",
  "Last 7 days": "7 derniers jours",
  "Last 30 days": "30 derniers jours",
  "Month to date": "Depuis le début du mois",
  "Year to date": "Depuis le début de l’année",
  "Last 3 months": "3 derniers mois",
  "Last 12 months": "12 derniers mois",
  Cancel: "Annuler",
  Apply: "Appliquer",
  "Starting shift…": "Ouverture du service…",
  "The shift could not be started. Please try again.":
    "Impossible d’ouvrir le service. Veuillez réessayer.",
  "Start shift": "Ouvrir le service",
  "View orders": "Voir les commandes",
  "Shift is open": "Le service est ouvert",
  "Today's net revenue": "Revenu net du jour",
  "Today's orders": "Commandes du jour",
  "Active orders": "Commandes actives",
  "In preparation": "En préparation",
  "Ready to serve": "Prêtes à servir",
  "Today at a glance": "Aujourd’hui en bref",
  "We couldn’t load live operations":
    "Impossible de charger l’activité en direct",
  "Check your connection, then try loading the latest shift and order activity again.":
    "Vérifiez votre connexion, puis rechargez les dernières activités du service et des commandes.",
  "Live progress from counter to kitchen.":
    "Suivi en direct de la caisse à la cuisine.",
  "No matching orders": "Aucune commande correspondante",
  "No active orders": "Aucune commande active",
  "Just now": "À l’instant",
  "Try a different order number or item name.":
    "Essayez un autre numéro de commande ou nom de plat.",
  "New orders will appear here as soon as service begins.":
    "Les nouvelles commandes apparaîtront ici dès le début du service.",
  "Clear search": "Effacer la recherche",
  Ticket: "Ticket",
  Opened: "Ouverture",
  Dining: "Service",
  Items: "Articles",
  Status: "Statut",
  Payment: "Paiement",
  Total: "Total",
  Unpaid: "Impayée",
  Tip: "Pourboire",
  Note: "Note",
  live: "en cours",
  "Sales by payment method": "Ventes par moyen de paiement",
  "How today's settled sales were collected.":
    "Répartition des ventes encaissées aujourd’hui.",
  "Could not load payment totals.":
    "Impossible de charger les totaux des paiements.",
  "Retrying…": "Nouvel essai…",
  "Dine-In": "Sur place",
  Pickup: "À emporter",
  Delivery: "Livraison",
  New: "Nouvelle",
  Preparing: "En préparation",
  Ready: "Prête",
  Completed: "Terminée",
  Cancelled: "Annulée",
  "Sales digest": "Résumé des ventes",
  "Preparing today's snapshot": "Préparation du bilan du jour",
  "Email yesterday's digest": "Envoyer le résumé d’hier",
  "Sending…": "Envoi…",
  "The digest could not be emailed. Please try again.":
    "Le résumé n’a pas pu être envoyé. Veuillez réessayer.",
  "Digest emailed.": "Résumé envoyé par e-mail.",
  "Digest prepared; email delivery is not configured.":
    "Résumé prêt ; l’envoi par e-mail n’est pas configuré.",
  "Digest email is unavailable. Check the recipient in settings.":
    "L’envoi du résumé est indisponible. Vérifiez le destinataire dans les paramètres.",
  // Phone voice (voice cloning)
  "Phone voice": "Voix téléphonique",
  "Clone a team member's voice for the phone ordering agent.":
    "Clonez la voix d’un membre de l’équipe pour l’agent de commande téléphonique.",
  "Record a new voice": "Enregistrer une nouvelle voix",
  "Voice cloning is not available": "Le clonage de voix n’est pas disponible",
  "Voice cloning is not available for this restaurant. Contact support.":
    "Le clonage de voix n’est pas disponible pour ce restaurant. Contactez l’assistance.",
  "Could not load your voices": "Impossible de charger vos voix",
  "Voice library": "Bibliothèque de voix",
  "Voices cloned for this restaurant. Only your team sees them.":
    "Voix clonées pour ce restaurant. Seule votre équipe les voit.",
  "No cloned voices yet": "Aucune voix clonée pour le moment",
  "Record 1–2 minutes of speech to create one.":
    "Enregistrez 1 à 2 minutes de parole pour en créer une.",
  "Phone voice updated": "Voix téléphonique mise à jour",
  "Changes apply from the next call.":
    "Les changements s’appliquent à partir du prochain appel.",
  "Could not change the phone voice":
    "Impossible de changer la voix téléphonique",
  "Phone agent voice": "Voix de l’agent téléphonique",
  "No phone agent is linked to this restaurant yet. You can still record voices; contact support to connect your phone line.":
    "Aucun agent téléphonique n’est encore lié à ce restaurant. Vous pouvez enregistrer des voix ; contactez l’assistance pour connecter votre ligne.",
  "Use platform default": "Utiliser la voix par défaut",
  "Cloned voice": "Voix clonée",
  cloned: "clonée",
  "Platform default": "Voix par défaut",
  "Voice:": "Voix :",
  "Changes apply from the next call. Calls in progress keep their current voice.":
    "Les changements s’appliquent au prochain appel. Les appels en cours gardent leur voix actuelle.",
  "Change voice": "Changer de voix",
  "Change PIN": "Changer le code PIN",
  "Sign-in PIN": "Code PIN de connexion",
  "Change the four-digit PIN you use to sign in and approve actions.":
    "Changez le code PIN à quatre chiffres que vous utilisez pour vous connecter et approuver des actions.",
  "Your PIN was changed.": "Votre code PIN a été modifié.",
  "Play sample": "Écouter un extrait",
  "The assigned voice is no longer usable; calls are using the default voice.":
    "La voix attribuée n’est plus utilisable ; les appels utilisent la voix par défaut.",
  "Could not play a sample": "Impossible de lire l’extrait",
  "Voice is ready": "La voix est prête",
  "Status checked": "Statut vérifié",
  "Could not check the status": "Impossible de vérifier le statut",
  "Voice deleted": "Voix supprimée",
  "On phone agent": "Sur l’agent téléphonique",
  "Waiting for the voice provider to verify it. Contact support, then check its status.":
    "En attente de vérification par le fournisseur. Contactez l’assistance, puis vérifiez son statut.",
  "Use on phone agent": "Utiliser sur l’agent",
  "Checking…": "Vérification…",
  "Check status": "Vérifier le statut",
  Delete: "Supprimer",
  "Switch the phone agent to another voice first.":
    "Attribuez d’abord une autre voix à l’agent téléphonique.",
  "Delete this voice?": "Supprimer cette voix ?",
  "Deleting…": "Suppression…",
  "Delete voice": "Supprimer la voix",
  "This permanently deletes the voice, including at the voice provider. It cannot be undone. Agents using it must be switched to another voice first.":
    "Cette action supprime définitivement la voix, y compris chez le fournisseur. Elle est irréversible. Les agents qui l’utilisent doivent d’abord changer de voix.",
  "Creating…": "Création…",
  "Verification required": "Vérification requise",
  Failed: "Échec",
  Disabled: "Désactivée",
  "Step 1 of 3 · Confirm the speaker has agreed.":
    "Étape 1 sur 3 · Confirmez l’accord de la personne.",
  "Step 2 of 3 · Record 1–2 minutes of natural speech.":
    "Étape 2 sur 3 · Enregistrez 1 à 2 minutes de parole naturelle.",
  "Step 3 of 3 · Name the voice for your library.":
    "Étape 3 sur 3 · Nommez la voix pour votre bibliothèque.",
  "Creating voice": "Création de la voix",
  "This can take up to 2 minutes. Keep this window open.":
    "Cela peut prendre jusqu’à 2 minutes. Gardez cette fenêtre ouverte.",
  "Voice created": "Voix créée",
  "Your new voice is saved.": "Votre nouvelle voix est enregistrée.",
  Done: "Terminé",
  "Use on the phone agent": "Utiliser sur l’agent téléphonique",
  Continue: "Continuer",
  "Creating voice…": "Création de la voix…",
  "Create voice": "Créer la voix",
  "The speaker has agreed to have their voice cloned for use on this restaurant's phone line.":
    "La personne a accepté que sa voix soit clonée pour la ligne téléphonique de ce restaurant.",
  "Confirm the speaker's consent to continue.":
    "Confirmez le consentement de la personne pour continuer.",
  "How was consent recorded?": "Comment le consentement a-t-il été recueilli ?",
  "e.g. Ama Mensah, signed consent form on 12 Nov, kept in the staff folder":
    "ex. Ama Mensah, formulaire signé le 12 nov., rangé dans le dossier du personnel",
  "Who agreed, when, and where the record is kept.":
    "Qui a accepté, quand, et où la preuve est conservée.",
  "Describe who consented and how.": "Indiquez qui a consenti et comment.",
  "One speaker only, with no music or other voices nearby.":
    "Une seule personne, sans musique ni autres voix à proximité.",
  "Speak at a normal pace in natural sentences.":
    "Parlez à un rythme normal, avec des phrases naturelles.",
  "Introduce yourself, describe a typical working day, and read a few menu items.":
    "Présentez-vous, décrivez une journée de travail type et lisez quelques plats du menu.",
  "Re-record rather than trim a take that went wrong.":
    "Réenregistrez plutôt que de couper une prise ratée.",
  "This browser cannot record audio. Open the dashboard in a current version of Chrome, Edge, or Safari.":
    "Ce navigateur ne peut pas enregistrer de son. Ouvrez le tableau de bord dans une version récente de Chrome, Edge ou Safari.",
  "Stop recording": "Arrêter l’enregistrement",
  "Record another take": "Enregistrer une autre prise",
  "Start recording": "Commencer l’enregistrement",
  "Allow microphone access in your browser, then try again.":
    "Autorisez l’accès au micro dans votre navigateur, puis réessayez.",
  "Record at least 20 seconds. About a minute gives the best result.":
    "Enregistrez au moins 20 secondes. Environ une minute donne le meilleur résultat.",
  "Enough to continue. A minute or more sounds more natural.":
    "Suffisant pour continuer. Une minute ou plus sonne plus naturel.",
  "Great length. You can continue.": "Bonne durée. Vous pouvez continuer.",
  Takes: "Prises",
  Take: "Prise",
  "Delete take": "Supprimer la prise",
  "Record at least one take.": "Enregistrez au moins une prise.",
  "Record at least 20 seconds of speech in total.":
    "Enregistrez au moins 20 secondes de parole au total.",
  "That recording is too large; send less than 20 MB in total.":
    "Cet enregistrement est trop volumineux ; envoyez moins de 20 Mo au total.",
  "Voice name": "Nom de la voix",
  "e.g. Mama Ama": "ex. Mama Ama",
  "Give the voice a name.": "Donnez un nom à la voix.",
  "Description (optional)": "Description (facultatif)",
  "Reduce background noise": "Réduire le bruit de fond",
  "Uploading recordings…": "Envoi des enregistrements…",
  "Creating the voice. This can take up to 2 minutes.":
    "Création de la voix. Cela peut prendre jusqu’à 2 minutes.",
  "The voice is ready. Use it on the phone agent, then play a sample to hear it.":
    "La voix est prête. Utilisez-la sur l’agent téléphonique, puis écoutez un extrait.",
  "The voice provider needs to verify this voice before it can be used. Contact support, and use Check status later to see if it is ready.":
    "Le fournisseur doit vérifier cette voix avant qu’elle soit utilisable. Contactez l’assistance, puis utilisez « Vérifier le statut » plus tard.",
  "This voice cannot be used yet. Check its status in the library.":
    "Cette voix n’est pas encore utilisable. Vérifiez son statut dans la bibliothèque.",
}

function readLanguage(): Language {
  if (typeof window === "undefined") return "en"
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "fr" ? "fr" : "en"
  } catch {
    return "en"
  }
}

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (english: string) => string
  locale: string
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => undefined,
  t: (english) => english,
  locale: "en-GH",
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    try {
      window.localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // The preference still applies for this session if storage is blocked.
    }
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (english) =>
        language === "fr" ? (french[english] ?? english) : english,
      locale: language === "fr" ? "fr-FR" : "en-GH",
    }),
    [language]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
