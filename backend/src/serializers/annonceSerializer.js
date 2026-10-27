// Prénom (+ initiale) déduit de la partie locale de l'email : l'adresse complète n'est jamais exposée.
export function displayName(email) {
    const [first, second] = email.split('@')[0].split(/[._+-]+/).filter(Boolean);
    if (!first) return 'Vendeur';
    const capitalized = first.charAt(0).toUpperCase() + first.slice(1);
    return second ? `${capitalized} ${second.charAt(0).toUpperCase()}.` : capitalized;
}

// Forme publique d'une annonce. `annonce.ownerId` doit être peuplé avec { email, createdAt }.
export function serializeAnnonce(annonce) {
    const owner = annonce.ownerId;
    const ownerId = String(annonce.populated('ownerId') ?? owner._id ?? owner);
    return {
        id: String(annonce._id),
        titre: annonce.titre,
        description: annonce.description,
        prix: annonce.prix,
        categorie: annonce.categorie,
        etat: annonce.etat,
        statut: annonce.statut,
        photo: annonce.photo,
        ville: annonce.ville,
        codePostal: annonce.codePostal,
        ownerId,
        vendeur: { id: ownerId, nom: owner?.email ? displayName(owner.email) : 'Vendeur', membreDepuis: owner?.createdAt ?? null },
        createdAt: annonce.createdAt,
        updatedAt: annonce.updatedAt,
    };
}

export const OWNER_FIELDS = 'email createdAt';
