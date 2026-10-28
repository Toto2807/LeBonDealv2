import AnnoncePhoto from './AnnoncePhoto.jsx';
import { formatDateRelative } from '../utils/format.js';

export default function ConversationList({ conversations, selection, onSelect }) {
  return (
    <ul className="conv-list" aria-label="Conversations">
      {conversations.map((conversation) => {
        const selectionnee = selection?.annonceId === conversation.annonceId && selection?.interlocuteurId === conversation.interlocuteur.id;
        const { dernierMessage } = conversation;
        return (
          <li key={`${conversation.annonceId}:${conversation.interlocuteur.id}`}>
            <button
              type="button"
              className={selectionnee ? 'conv-item selected' : 'conv-item'}
              aria-current={selectionnee ? 'true' : undefined}
              onClick={() => onSelect({ annonceId: conversation.annonceId, interlocuteurId: conversation.interlocuteur.id })}
            >
              <span className="conv-thumb"><AnnoncePhoto key={conversation.annoncePhoto} src={conversation.annoncePhoto} alt="" /></span>
              <span className="conv-text">
                <span className="conv-top">
                  <span className="conv-name">{conversation.interlocuteur.nom}</span>
                  <time className="conv-date" dateTime={dernierMessage.createdAt}>{formatDateRelative(dernierMessage.createdAt)}</time>
                </span>
                <span className="conv-annonce">{conversation.annonceTitre ?? 'Annonce supprimée'}</span>
                <span className="conv-preview">{dernierMessage.fromMe ? 'Vous : ' : ''}{dernierMessage.message}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
