import { createContext, useCallback, useContext, useRef, useState } from 'react';

import { messageErreur } from '../api/client';

/**
 * Messages courts affichés quelques secondes (les « snackbars » du mobile) :
 * confirmation d'une action, ou erreur de l'API.
 *
 * ```js
 * const { afficherMessage, afficherErreur } = useMessages();
 * afficherMessage('Adresse enregistrée.');
 * afficherErreur(erreur); // erreur attrapée dans un try / catch
 * ```
 */
const ContexteMessages = createContext(null);

const DUREE = 4500;

export function FournisseurMessages({ children }) {
  const [messages, setMessages] = useState([]);
  const prochainId = useRef(1);

  const afficherMessage = useCallback((texte) => {
    const id = prochainId.current++;
    // Un seul message à la fois, comme sur le mobile.
    setMessages([{ id, texte }]);
    setTimeout(() => setMessages((liste) => liste.filter((m) => m.id !== id)), DUREE);
  }, []);

  const afficherErreur = useCallback((erreur) => afficherMessage(messageErreur(erreur)), [afficherMessage]);

  return (
    <ContexteMessages.Provider value={{ afficherMessage, afficherErreur }}>
      {children}
      <div className="messages" aria-live="polite">
        {messages.map((message) => (
          <div className="message" key={message.id}>
            {message.texte}
          </div>
        ))}
      </div>
    </ContexteMessages.Provider>
  );
}

export function useMessages() {
  return useContext(ContexteMessages);
}
