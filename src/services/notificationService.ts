import { Equipment, Transaction, User, EquipmentStatus } from '../types';
import { supabase } from '../supabaseClient';

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
  body += `Ceci est un message automatique généré par FireStock.\n`;

  console.log(`[EMAIL SIMULATION] To: ${ADMIN_EMAIL}`);
  console.log(body);

  // Tentative d'appel à une Edge Function Supabase (si configurée)
  // Si aucune fonction n'existe, cela échouera silencieusement dans la console sans bloquer l'app
  try {
    await supabase.functions.invoke('send-email', {
      body: {
        to: ADMIN_EMAIL,
        subject: `[FireStock] Mouvement de stock - ${type}`,
        text: body
      }
    });
  } catch (e) {
    console.warn("L'envoi automatique nécessite une Edge Function Supabase configurée.", e);
  }
};