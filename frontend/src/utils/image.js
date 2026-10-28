export const TYPES_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX_CHOISIE = 20 * 1024 * 1024;
const COTE_MAX = 1600;
const ENVOI_MAX = 5 * 1024 * 1024;

// Prépare une photo avant l'envoi : contrôle du format, réduction à 1600 px maximum et recompression en JPEG.
// Les photos de téléphone (plusieurs Mo) passent ainsi sous la limite de 5 Mo, et les métadonnées (position GPS…) sont retirées.
export async function preparerImage(fichier) {
  if (!TYPES_IMAGE.includes(fichier.type)) throw new Error('Format non pris en charge : choisis une image JPEG, PNG ou WebP.');
  if (fichier.size > TAILLE_MAX_CHOISIE) throw new Error('Cette image est trop lourde (20 Mo maximum).');

  let image;
  try {
    image = await createImageBitmap(fichier);
  } catch {
    throw new Error('Impossible de lire cette image. Essaie avec un autre fichier.');
  }

  const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
  const largeur = Math.max(1, Math.round(image.width * echelle));
  const hauteur = Math.max(1, Math.round(image.height * echelle));
  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  const contexte = canvas.getContext('2d');
  // Fond blanc : une PNG transparente ne devient pas noire en JPEG.
  contexte.fillStyle = '#fff';
  contexte.fillRect(0, 0, largeur, hauteur);
  contexte.drawImage(image, 0, 0, largeur, hauteur);
  image.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Impossible de traiter cette image.');
  if (blob.size > ENVOI_MAX) throw new Error('Cette image reste trop lourde après compression (5 Mo maximum).');
  return blob;
}
