import { useCallback, useEffect, useRef, useState } from 'react';
import { Hourglass } from 'lucide-react';

import { api } from '../../api/client';
import { BlocGris, Bouton, Roue } from '../../composants';
import { lireObjet } from '../../utils/lecture';
import './paiement.css';

/**
 * Paiement GeniusPay (décision D17 : l'opérateur mobile money se choisit sur
 * la page GeniusPay, pas dans l'application).
 *
 * Dans un navigateur, la page GeniusPay s'ouvre dans un nouvel onglet ;
 * l'application vérifie le paiement pendant ce temps (AttentePaiement).
 *
 * Les navigateurs bloquent un onglet ouvert après une attente réseau : on
 * ouvre donc l'onglet tout de suite, au clic, puis on y charge la page une
 * fois l'adresse reçue du serveur.
 *
 * ```js
 * const onglet = preparerOngletPaiement();      // dans le clic
 * const paiement = await payerCommande(id);     // appel au serveur
 * ouvrirPagePaiement(paiement.checkoutUrl, onglet);
 * ```
 */
export function preparerOngletPaiement() {
  const onglet = window.open('', '_blank');
  if (onglet) {
    try {
      onglet.document.title = 'Paiement sécurisé';
      onglet.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;padding:32px;color:#616168">Ouverture de la page de paiement sécurisée…</p>';
    } catch {
      // Sans importance : l'onglet sera rempli dans un instant.
    }
  }
  return onglet;
}

/**
 * Charge la page de paiement dans l'onglet préparé (ou en ouvre un).
 * Renvoie faux si le navigateur a bloqué l'ouverture.
 */
export function ouvrirPagePaiement(url, onglet = null) {
  if (onglet && !onglet.closed) {
    // La page GeniusPay ne doit pas pouvoir agir sur l'onglet Tôligo.
    onglet.opener = null;
    onglet.location.href = url;
    return true;
  }
  return Boolean(window.open(url, '_blank', 'noopener'));
}

/** Ferme l'onglet préparé si le paiement n'a pas pu être lancé. */
export function fermerOnglet(onglet) {
  if (onglet && !onglet.closed) onglet.close();
}

/**
 * Interroge GeniusPay via le serveur. Vrai si le paiement est confirmé.
 * Utile en local, où le webhook GeniusPay ne peut pas joindre le serveur.
 */
export async function verifierPaiement(referenceFournisseur) {
  if (!referenceFournisseur) return false;
  try {
    const donnees = lireObjet(await api.get(`/client/payments/check/${encodeURIComponent(referenceFournisseur)}`));
    return donnees.status === 'completed';
  } catch {
    return false;
  }
}

/**
 * Attente de la confirmation d'un paiement.
 *
 * Appelle `estPaye` toutes les `intervalle` millisecondes jusqu'à ce qu'il
 * réponde vrai, puis `onPaye`. Au-delà de `delaiMax`, propose de vérifier à
 * nouveau ou de rouvrir la page de paiement.
 *
 * L'intervalle est de 15 s : le serveur accepte au plus 5 vérifications de
 * paiement par minute (throttle:5,1 sur /client/payments/check).
 */
export function AttentePaiement({ estPaye, onPaye, onRelancer, intervalle = 15000, delaiMax = 180000 }) {
  const [verification, setVerification] = useState(false);
  const [abandon, setAbandon] = useState(false);
  const debut = useRef(Date.now());
  const enCours = useRef(false);
  const termine = useRef(false);

  const verifier = useCallback(async () => {
    if (enCours.current || termine.current) return;
    enCours.current = true;
    setVerification(true);
    try {
      if (await estPaye()) {
        termine.current = true;
        onPaye();
        return;
      }
    } finally {
      enCours.current = false;
      setVerification(false);
    }
    if (Date.now() - debut.current > delaiMax) setAbandon(true);
  }, [estPaye, onPaye, delaiMax]);

  useEffect(() => {
    if (abandon) return undefined;
    const minuteur = setInterval(verifier, intervalle);
    return () => clearInterval(minuteur);
  }, [abandon, intervalle, verifier]);

  // Retour sur l'onglet Tôligo après avoir payé : on vérifie aussitôt.
  useEffect(() => {
    const surRetour = () => {
      if (document.visibilityState === 'visible') verifier();
    };
    document.addEventListener('visibilitychange', surRetour);
    return () => document.removeEventListener('visibilitychange', surRetour);
  }, [verifier]);

  return (
    <BlocGris className="attente-paiement">
      {!abandon ? (
        <>
          <Roue taille="grande" />
          <h3 className="attente-paiement__titre">Paiement en cours de vérification</h3>
          <p className="attente-paiement__texte">
            Terminez le paiement dans l'onglet GeniusPay, puis validez la demande sur votre téléphone avec votre code secret
            mobile money. Cet écran se met à jour tout seul.
          </p>
        </>
      ) : (
        <>
          <Hourglass size={32} color="var(--texte-secondaire)" aria-hidden="true" />
          <h3 className="attente-paiement__titre">Paiement pas encore confirmé</h3>
          <p className="attente-paiement__texte">Si vous avez payé, la confirmation peut prendre quelques minutes.</p>
        </>
      )}
      <Bouton
        variante="secondaire"
        enCours={verification}
        onClick={() => {
          if (abandon) {
            debut.current = Date.now();
            setAbandon(false);
          }
          verifier();
        }}
      >
        J'ai payé, vérifier
      </Bouton>
      <Bouton variante="texte" onClick={onRelancer}>
        Rouvrir la page de paiement
      </Bouton>
    </BlocGris>
  );
}
