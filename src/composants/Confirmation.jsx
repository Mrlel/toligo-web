import { createContext, useCallback, useContext, useState } from 'react';

import { Bouton } from './Boutons';
import { Modale } from './Modale';

/**
 * Demande de confirmation avant une action (« Abandonner cet envoi ? »).
 *
 * ```js
 * const confirmer = useConfirmation();
 * const ok = await confirmer({
 *   titre: 'Supprimer cette adresse ?',
 *   texte: '« Bureau » sera retirée de votre carnet.',
 *   accepter: 'Supprimer',
 *   refuser: 'Annuler',
 *   danger: true,
 * });
 * if (!ok) return;
 * ```
 */
const ContexteConfirmation = createContext(null);

export function FournisseurConfirmation({ children }) {
  const [demande, setDemande] = useState(null);

  const confirmer = useCallback(
    (options) =>
      new Promise((resoudre) => {
        setDemande({ ...options, resoudre });
      }),
    [],
  );

  const repondre = (reponse) => {
    demande?.resoudre(reponse);
    setDemande(null);
  };

  return (
    <ContexteConfirmation.Provider value={confirmer}>
      {children}
      <Modale ouverte={demande !== null} onFermer={() => repondre(false)} titre={demande?.titre} sansCroix>
        {demande?.texte && <p className="modale__texte">{demande.texte}</p>}
        {demande?.contenu}
        <div className="modale__actions" style={{ padding: '20px 0 0' }}>
          {demande?.refuser !== null && (
            <Bouton variante="secondaire" onClick={() => repondre(false)}>
              {demande?.refuser ?? 'Annuler'}
            </Bouton>
          )}
          <Bouton variante={demande?.danger ? 'accent' : 'principal'} onClick={() => repondre(true)} data-focus-initial>
            {demande?.accepter ?? 'Confirmer'}
          </Bouton>
        </div>
      </Modale>
    </ContexteConfirmation.Provider>
  );
}

export function useConfirmation() {
  return useContext(ContexteConfirmation);
}
