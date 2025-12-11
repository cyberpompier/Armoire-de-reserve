import { Equipment, Transaction, User } from '../types';

const ADMIN_EMAIL = 'sebastien.dupressoir@sdis60.fr';

export const sendTransactionNotification = async (
  transactions: Transaction[], 
  inventory: Equipment[], 
  users: User[],
  currentUser: User | null
) => {
  if (!transactions.length) return;

  const type = transactions[0].type === 'OUT' ? 'EMPRUNT' : 'RESTITUTION';
  const timestamp = new Date().toLocaleString('fr-FR');
  const performerName = currentUser ? `${currentUser.rank} ${currentUser.name}` : 'Inconnu';

  // Construction du corps de l'email
  // Utilisation de encodeURIComponent pour le sujet et le corps garantit que les caractères spéciaux passent bien
  let body = `NOTIFICATION FIRE-STOCK\n`;
  body += `------------------------------------------------\n`;
  body += `TYPE : ${type}\n`;
  body += `DATE : ${timestamp}\n`;
  body += `OPERATEUR : ${performerName}\n`;
  body += `------------------------------------------------\n\n`;

  body += `DÉTAILS DES ÉQUIPEMENTS :\n`;

  transactions.forEach(t => {
    const item = inventory.find(i => i.id === t.equipmentId);
    const targetUser = users.find(u => u.id === t.userId);
    const targetName = targetUser ? `${targetUser.rank} ${targetUser.name}` : 'N/A';
    
    if (item) {
      body += `- ${item.type} (Ref: ${item.barcode})\n`;
      body += `  État: ${item.condition} | Taille: ${item.size}\n`;
      if (t.type === 'OUT') {
        body += `  Attribué à : ${targetName}\n`;
        if (t.reason) body += `  Motif : ${t.reason}\n`;
      } else {
        body += `  Rendu par : ${targetName}\n`;
      }
      if (t.note) body += `  Note : ${t.note}\n`;
      body += `\n`;
    }
  });

  body += `------------------------------------------------\n`;
  body += `Généré par FireStock.\n`;

  const subject = `[FireStock] Mouvement de stock - ${type}`;

  const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  // Méthode standard : Redirection directe vers le protocole mailto.
  // C'est la méthode la plus fiable sur mobile et desktop.
  window.location.href = mailtoLink;
};