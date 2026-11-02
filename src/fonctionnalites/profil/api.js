import { api } from '../../api/client';
import { lireBooleen, lireEntier, lireListe, lireObjet } from '../../utils/lecture';

/** Profil du client connecté (GET /client/me). */
function versProfil(json) {
  const livraison = lireObjet(json.paiement_a_la_livraison);
  return {
    id: json.uuid ?? '',
    nomComplet: json.nom_complet ?? '',
    telephone: json.telephone ?? '',
    telephoneVerifie: lireBooleen(json.telephone_verifie),
    email: json.email ?? null,
    nbAdresses: lireEntier(json.nb_adresses) ?? 0,
    paiementALaLivraison: lireBooleen(livraison.disponible),
    motifPaiementALaLivraison: livraison.motif ?? null,
  };
}

export async function chargerProfil() {
  return versProfil(lireObjet(await api.get('/client/me')));
}

export async function modifierProfil({ nomComplet, email }) {
  const donnees = await api.put('/client/profile', {
    nom_complet: nomComplet,
    email: email ? email : null,
  });
  return versProfil(lireObjet(donnees));
}

/** Contacts du support (GET /assistances) : `whatsapp` ou `telephone`. */
export async function listerContactsSupport() {
  return lireListe(await api.get('/assistances')).map((json) => ({
    type: json.type ?? 'telephone',
    contact: json.contact ?? '',
    description: json.description ?? null,
  }));
}
