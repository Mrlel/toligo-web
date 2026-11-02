import { ChevronRight, LifeBuoy, MessageCircle, Phone } from 'lucide-react';

import { EnTete, Page, VueDonnees, VueVide } from '../../composants';
import { Routes } from '../../commun/routes';
import { useDonnees } from '../../utils/useDonnees';
import { listerContactsSupport } from './api';

/** Lien d'un contact : WhatsApp (wa.me) ou appel téléphonique. */
function lienContact(contact) {
  const numero = contact.contact.replace(/[^\d+]/g, '');
  return contact.type === 'whatsapp' ? `https://wa.me/${numero.replace('+', '')}` : `tel:${numero}`;
}

/** Centre d'aide : contacts du support Tôligo (WhatsApp, téléphone). */
export default function AidePage() {
  const contacts = useDonnees(listerContactsSupport, []);

  return (
    <Page titre="Centre d'aide" entete={<EnTete titre="Centre d'aide" repli={Routes.profil} />}>
      <p className="texte-secondaire" style={{ fontSize: 13.5, paddingTop: 8 }}>
        Une question ? Notre équipe vous répond.
      </p>
      <div className="pile" style={{ gap: 10, marginTop: 16 }}>
        <VueDonnees etat={contacts}>
          {(liste) =>
            liste.length === 0 ? (
              <VueVide titre="Aucun contact disponible pour le moment" icone={LifeBuoy} />
            ) : (
              liste.map((contact, i) => {
                const whatsapp = contact.type === 'whatsapp';
                const Icone = whatsapp ? MessageCircle : Phone;
                return (
                  <a
                    key={i}
                    className="carte carte--sans-ombre rangee"
                    style={{ gap: 12 }}
                    href={lienContact(contact)}
                    target={whatsapp ? '_blank' : undefined}
                    rel={whatsapp ? 'noreferrer' : undefined}
                  >
                    <Icone size={22} color="var(--accent)" />
                    <span className="extensible">
                      <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700 }}>{whatsapp ? 'WhatsApp' : 'Téléphone'}</span>
                      <span className="texte-secondaire" style={{ display: 'block', fontSize: 13 }}>
                        {contact.contact}
                      </span>
                      {contact.description && (
                        <span className="texte-secondaire" style={{ display: 'block', fontSize: 12.5 }}>
                          {contact.description}
                        </span>
                      )}
                    </span>
                    <ChevronRight size={20} color="var(--texte-discret)" />
                  </a>
                );
              })
            )
          }
        </VueDonnees>
      </div>
    </Page>
  );
}
