import { Equipment, Transaction, User } from '../types';

const ADMIN_EMAIL = 'sebastien.dupressoir@sdis60.fr';

export const generateMailtoLink = (
  transactions: Transaction[], 
  inventory: Equipment[], 
  users: User[],
  currentUser: User | null
): string | null => {
  if (!transactions.length) return null;

  const type = transactions[0].type === 'OUT' ? 'EMPRUNT' : 'RESTITUTION';
  const performerName = currentUser ? currentUser.name : 'Inconnu';

  // Version ultra-concise pour éviter les limites de longueur d'URL (max ~2000 chars)
  let body = `FIRE-STOCK - ${type}\n`;
  body += `Par: ${performerName}\n\n`;

  transactions.forEach(t => {
    const item = inventory.find(i => i.id === t.equipmentId);
    const targetUser = users.find(u => u.id === t.userId);
    
    if (item) {
      body += `> ${item.type} (${item.barcode})\n`;
      if (t.type === 'OUT' && targetUser) {
        body += `  Pour: ${targetUser.name}\n`;
      }
      if (t.note) body += `  Note: ${t.note}\n`;
    }
  });

  const subject = `Mvt Stock: ${type}`;

  return `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const sendTransactionNotification = (mailtoLink: string) => {
  // Tentative d'ouverture standard
  // _self force l'ouverture dans le contexte actuel, souvent mieux toléré pour mailto
  window.open(mailtoLink, '_self');
};