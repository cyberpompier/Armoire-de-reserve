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

  // Utilisation de \r\n pour une meilleure compatibilité des sauts de ligne dans mailto
  let body = `NOTIFICATION FIRE-STOCK\r\n`;
  body += `------------------------------------------------\r\n`;
  body += `TYPE : ${type}\r\n`;
  body += `DATE : ${timestamp}\r\n`;
  body += `OPERATEUR : ${performerName}\r\n`;
  body += `------------------------------------------------\r\n\r\n`;

  body += `DÉTAILS DES ÉQUIPEMENTS :\r\n`;

  transactions.forEach(t => {
    const item = inventory.find(i => i.id === t.equipmentId);
    const targetUser = users.find(u => u.id === t.userId);
    const targetName = targetUser ? `${targetUser.rank} ${targetUser.name}` : 'N/A';
    
    if (item) {
      body += `- ${item.type} (Ref: ${item.barcode})\r\n`;
      body += `  État: ${item.condition} | Taille: ${item.size}\r\n`;
      if (t.type === 'OUT') {
        body += `  Attribué à : ${targetName}\r\n`;
        if (t.reason) body += `  Motif : ${t.reason}\r\n`;
      } else {
        body += `  Rendu par : ${targetName}\r\n`;
      }
      if (t.note) body += `  Note : ${t.note}\r\n`;
      body += `\r\n`;
    }
  });

  body += `------------------------------------------------\r\n`;
  body += `Généré par FireStock.\r\n`;

  const subject = `[FireStock] Mouvement de stock - ${type}`;

  // Création d'un lien invisible et simulation de clic
  // Cette méthode est souvent plus robuste que window.location.href pour les mailto
  const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  const link = document.createElement('a');
  link.href = mailtoLink;
  link.target = '_blank'; // Force l'ouverture dans un contexte séparé pour éviter de bloquer l'UI
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};