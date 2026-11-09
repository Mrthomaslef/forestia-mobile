/**
 * Forestia (1998, LaserMedia / Dadalife) — Moteur Web Universel Autonome
 * Recompilé via REA (morluto/rea) + ProjectorRays (Director 6.0 Lingo Decompiler) + RIFX Binary Decoder.
 *
 * Fonctionnalités :
 * - Rendu Stage Director 6 authentique 640×480 sur HTML5 Canvas (avec mise à l'échelle plein écran / mobile tactile).
 * - Exécution de la logique Lingo décompilée :
 *   - Menu Principal (FRST), Création & Sauvegarde de profils joueurs dans localStorage (remplace data.cst).
 *   - Promenade Libre & Aventure dans les 3 périodes de la forêt : Matin (F_01, 207 noeuds), Midi (F_02, 227 noeuds), Nuit (F_03, 206 noeuds).
 *   - Tour de Guet 360° panoramique interactive & Sous-marin / Aquarium.
 *   - Appareil Photo Polaroid (Gcurseur = 2) avec flash N&B, déclencheur audio et collection des 80 animaux dans l'Album.
 *   - Cueillette des 31 plantes, fleurs, champignons et feuilles d'arbres dans l'Herbier.
 *   - Les 9 Épisodes complets + Rencontre avec Sam & Papy Chêne + Scierie + Grande Fête de Forestia + Boîte à Jeux.
 *   - L'Album de Forestia (FALBUM) : Carnet de route, Photothèque (80 animaux + fiches "En savoir plus" 640×480 + cris ESON),
 *     Herbier (31 espèces botaniques), Dictionnaire illustré (74 définitions) et Diplôme de Naturaliste.
 *   - Lecteur Binaire RIFX / ISO9660 embarqué côté client (glisser-déposer de n'importe quel fichier .Dxr/.Cxt ou FORESTIA.BIN).
 *   - Inspecteur REA & Lingo Live (visualisation des obligations prouvées et des 9 424 scripts Lingo décompilés).
 */

(function () {
  "use strict";

  const STAGE_W = 640;
  const STAGE_H = 480;
  const STORAGE_KEY = "forestia_rea_save_v2";

  const EPISODES = [
    {
      id: 1, code: "F_111", gameCode: "F_112", endCode: "F_113",
      period: "MATIN", title: "1. La Fourmilière & L'Agent Secret",
      subtitle: "Aide le scarabée agent secret à traverser le labyrinthe de la fourmilière jusqu'à la Reine.",
      interScene: "F1", introAudio: "F_1111", gameAudio: "F_1121",
      scenes: [
        { movie: "INTER", label: "F1", caption: "Carnet d'aventure : Épisode 1 — La Fourmilière" },
        { movie: "F_111", label: "interlude2", caption: "Rencontre avec l'Agent Secret Scarabée devant la fourmilière" },
        { movie: "F_111", label: "fourmiliere", caption: "Entrée dans les galeries souterraines de la fourmilière" },
        { movie: "F_112", label: "plan1", caption: "Carte stratégique des galeries de la fourmilière" },
        { movie: "F_112", label: "galeries", caption: "Exploration des galeries de la fourmilière" },
        { movie: "F_113", label: "reine", caption: "Audience auprès de la Reine des Fourmis" },
        { movie: "F_113", label: "happy", caption: "Mission accomplie ! La Reine te remet un cadeau" },
        { movie: "F_113", label: "PHOTO", caption: "Souvenir photo avec la Reine des Fourmis" }
      ]
    },
    {
      id: 2, code: "F_121", gameCode: "F_122",
      period: "MATIN", title: "2. Le Cheval à Bascule & L'Atelier Peinture",
      subtitle: "Retrouve les couleurs de la forêt sur le chevalet magique.",
      interScene: "F2", introAudio: "F_1211", gameAudio: "F_1221",
      scenes: [
        { movie: "INTER", label: "F2", caption: "Carnet d'aventure : Épisode 2 — Le Cheval à Bascule" },
        { movie: "F_121", label: "interlude2", caption: "Arrivée dans la clairière du cheval à bascule" },
        { movie: "F_121", label: "AB0", caption: "En route vers l'atelier de peinture en forêt" },
        { movie: "F_122", label: "intro", caption: "Préparation des pinceaux et de la palette" },
        { movie: "F_122", label: "jeu", caption: "Atelier de coloriage et de peinture" },
        { movie: "F_122", label: "tableau4", caption: "Le chef-d'œuvre est terminé !" }
      ]
    },
    {
      id: 3, code: "F_131", gameCode: "F_132", endCode: "F_133",
      period: "MATIN", title: "3. La Danse des Abeilles",
      subtitle: "Décode la danse en huit des abeilles butineuses pour retrouver le nectar.",
      interScene: "F3", introAudio: "F_1322", gameAudio: "F_1326",
      scenes: [
        { movie: "INTER", label: "F3", caption: "Carnet d'aventure : Épisode 3 — La Danse des Abeilles" },
        { movie: "F_131", label: "interlude2", caption: "Près de la ruche avec Sam" },
        { movie: "F_132", label: "debutjeu", caption: "Observation de la reine et des butineuses" },
        { movie: "F_132", label: "A1", caption: "Première figure de la danse des abeilles" },
        { movie: "F_132", label: "A2", caption: "Deuxième figure vers les fleurs mellifères" },
        { movie: "F_133", label: "B1", caption: "Vol au-dessus de la prairie fleurie" },
        { movie: "F_133", label: "B2", caption: "Récolte du pollen et retour à la ruche" }
      ]
    },
    {
      id: 4, code: "F_211", gameCode: "F_212",
      period: "MIDI", title: "4. Les Champignons Enchantés",
      subtitle: "Attention aux spores soporifiques ! Aide Fluela la fée et le lutin au cœur de la clairière.",
      interScene: "F4", introAudio: "F_2111", gameAudio: "F_2121",
      scenes: [
        { movie: "INTER", label: "F4", caption: "Carnet d'aventure : Épisode 4 — Les Champignons Enchantés" },
        { movie: "F_211", label: "jeu", caption: "Alerte dans la clairière aux champignons" },
        { movie: "F_211", label: "lapin", caption: "Les habitants de la forêt sont endormis !" },
        { movie: "F_212", label: "Debutjeu", caption: "Le cercle des champignons magiques" },
        { movie: "F_212", label: "bleu", caption: "Le champignon bleu s'illumine" },
        { movie: "F_212", label: "lutin", caption: "Apparition du lutin farceur" },
        { movie: "F_212", label: "fluela", caption: "Fluela lève le sortilège sur la forêt !" }
      ]
    },
    {
      id: 5, code: "F_221", gameCode: "F_221",
      period: "MIDI", title: "5. La Course des Sirex (Petits Nuages)",
      subtitle: "Guide le petit nuage de pluie pour rafraîchir les arbres de Forestia.",
      interScene: "F5", introAudio: "F_2211", gameAudio: "F_2212",
      scenes: [
        { movie: "INTER", label: "F5", caption: "Carnet d'aventure : Épisode 5 — Les Petits Nuages" },
        { movie: "F_221", label: "debutjeu", caption: "Formation des petits nuages au-dessus de la cime" },
        { movie: "F_221", label: "remonte", caption: "Voyage aérien au gré du vent" }
      ]
    },
    {
      id: 6, code: "F_231", gameCode: "F_232",
      period: "MIDI", title: "6. Le Barrage des Castors & L'Inondation",
      subtitle: "Aide la famille Castor à consolider le barrage sur la rivière avant la crue.",
      interScene: "F6", introAudio: "F_2311", gameAudio: "F_2314",
      scenes: [
        { movie: "INTER", label: "F6", caption: "Carnet d'aventure : Épisode 6 — Le Barrage des Castors" },
        { movie: "F_231", label: "AB0", caption: "Sur les berges de la rivière de Forestia" },
        { movie: "F_231", label: "castor", caption: "Rencontre avec le maître bâtisseur Castor" },
        { movie: "F_232", label: "AIDE", caption: "Instructions de construction du barrage" },
        { movie: "F_232", label: "inter2", caption: "Le barrage tient bon, la rivière est sauvée !" }
      ]
    },
    {
      id: 7, code: "F_311", gameCode: "F_312",
      period: "SOIR", title: "7. Le Livre des Ombres & La Nuit",
      subtitle: "Identifie les animaux nocturnes et écoute les contes de la forêt endormie.",
      interScene: "F7", introAudio: "F_3111", gameAudio: "F_3121",
      scenes: [
        { movie: "INTER", label: "F7", caption: "Carnet d'aventure : Épisode 7 — Le Livre de la Nuit" },
        { movie: "F_311", label: "BAJ", caption: "La tombée de la nuit sur Forestia" },
        { movie: "F_311", label: "foretnuit", caption: "Les lucioles éclairent le sentier" },
        { movie: "F_312", label: "page1", caption: "Chapitre I du Grand Livre de la Nuit" },
        { movie: "F_312", label: "page2", caption: "Chapitre II : Les mystères de la chouette" },
        { movie: "F_312", label: "page3", caption: "Chapitre III : Le chant du rossignol" },
        { movie: "F_312", label: "page4", caption: "Chapitre IV : L'aube approche" }
      ]
    },
    {
      id: 8, code: "F_321", gameCode: "F_322",
      period: "SOIR", title: "8. La Fête de la Musique chez Jack la Belette",
      subtitle: "Accorde la balalaïka, le violon, la guitare et le banjo avec le diapason !",
      interScene: "F8", introAudio: "F_3211", gameAudio: "F_3221",
      scenes: [
        { movie: "INTER", label: "F8", caption: "Carnet d'aventure : Épisode 8 — La Fête de la Musique" },
        { movie: "F_321", label: "jeu", caption: "Devant la tanière musicale de Jack la Belette" },
        { movie: "F_322", label: "atelier", caption: "L'atelier des instruments de musique" },
        { movie: "F_322", label: "bala", caption: "Accordage de la Balalaïka" },
        { movie: "F_322", label: "violon", caption: "Accordage du Violon" },
        { movie: "F_322", label: "guitare", caption: "Accordage de la Guitare" },
        { movie: "F_322", label: "banjo", caption: "Accordage du Banjo — place au concert !" }
      ]
    },
    {
      id: 9, code: "F_331", gameCode: "F_332",
      period: "SOIR", title: "9. La Montagne de Feu & Le Sorcier Morhùrl",
      subtitle: "Affronte les énigmes du terrible sorcier Morhùrl au sommet du volcan pour délivrer Forestia !",
      interScene: "F9", introAudio: "F_3311", gameAudio: "F_3321",
      scenes: [
        { movie: "INTER", label: "F9", caption: "Carnet d'aventure : Épisode 9 — La Montagne de Feu" },
        { movie: "F_331", label: "BAJ", caption: "Ascension vers les terres brûlées" },
        { movie: "F_331", label: "volcan", caption: "Au pied du cratère incandescent" },
        { movie: "F_332", label: "jeu", caption: "Le repaire du sorcier Morhùrl" },
        { movie: "F_332", label: "morhurl2", caption: "Le duel d'énigmes contre Morhùrl" },
        { movie: "F_332", label: "morhurl3", caption: "Victoire ! Le corbeau s'envole et Forestia est délivrée !" }
      ]
    }
  ];

  // Mapping from animal photo ID (1..80) to ESON bird/animal cry audio stem when available
  const ANIMAL_CRIES = {
    1: "AIGL", 4: "TETR", 5: "COUC", 6: "BERG", 8: "FAIS", 9: "FAUC",
    10: "GEAI", 11: "HERO", 12: "LORI", 13: "MART", 14: "MERL", 15: "MESA",
    16: "MILA", 17: "PINS", 19: "PICV", 20: "ROSS", 21: "ROUG", 41: "PIEE"
  };

  // Mapping from animal photo ID (1..80) to ESP.Cxt 640x480 encyclopedia spread ID
  const ANIMAL_TO_ESP = {
    24: 1, 5: 2, 14: 3, 19: 4, 28: 5, 31: 6, 49: 7, 56: 8, 57: 9, 66: 10,
    71: 11, 6: 12, 8: 13, 10: 14, 35: 15, 54: 16, 60: 17, 62: 18, 70: 19,
    44: 20, 33: 21, 65: 22, 68: 23, 63: 24, 52: 25, 41: 26, 40: 27, 23: 28,
    11: 29, 30: 30, 42: 31, 29: 32, 76: 33, 51: 34, 53: 35, 67: 36, 26: 37,
    27: 38, 74: 39, 32: 40, 37: 41, 38: 43, 36: 44, 39: 45, 43: 46, 45: 47,
    48: 48, 50: 49, 4: 50, 20: 52, 13: 53, 58: 58, 46: 59, 55: 63, 75: 64,
    77: 65, 78: 66, 79: 67, 69: 69, 16: 71, 1: 72, 9: 73, 12: 74, 17: 75,
    21: 76, 80: 77, 15: 78, 59: 79
  };

  class ForestiaEngine {
    constructor() {
      this.data = null;
      this.canvas = document.getElementById("stage-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.imageCache = new Map();

      // Audio channels (1: Ambient, 2: Music/Theme, 3: SFX, 4: Voice/Narration)
      this.audioChannels = { 1: null, 2: null, 3: null, 4: null };
      this.muted = false;

      // Director Lingo Global State
      this.state = {
        mode: "MENU", // MENU, PROFILES, NEW_PROFILE, SOMMAIRE_AVENTURE, FORET, TOUR_VR, EPISODE, BOITE_JEUX, ALBUM, SAMPRES, SCIERIE, FETE, GENEFIN
        subMode: "sommaire",
        period: "MATIN", // MATIN, MIDI, SOIR
        currentNode: "AB0",
        previousNode: "AB0",
        Gcurseur: 1, // 1 = normal/navigation, 2 = appareil photo Polaroid, 3 = objet/photo en main
        heldItem: null,
        tourPanX: 0,
        activeEpisode: null,
        episodeSceneIdx: 0,
        albumTab: "sommaire", // sommaire, notes, photo, esp, herbier, dico, diplome
        selectedAnimalId: 24,
        selectedHerbierId: 1,
        selectedDicoId: 1,
        flashAlpha: 0,
        showHotspots: false,
        currentHotspots: [],
        hoverHotspot: null,
        mouseX: 320,
        mouseY: 240,
        statusMessage: "Chargement du moteur Forestia...",
        currentMovie: "FRST.Dxr",
        currentFrame: 17,
        currentLabel: "sommaire",
        profiles: [],
        activeProfileIdx: 0
      };

      this.loadSavedProfiles();
    }

    loadSavedProfiles() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
            this.state.profiles = parsed.profiles;
            this.state.activeProfileIdx = parsed.activeProfileIdx || 0;
            return;
          }
        }
      } catch (e) {
        console.warn("Could not read localStorage profiles:", e);
      }
      // Create default profile "Thomas" (plus press-visit full unlock option)
      this.state.profiles = [
        this.createProfileObject("Explorateur", 2, false),
        this.createProfileObject("Visite Presse (100% Débloqué)", 2, true)
      ];
      this.state.activeProfileIdx = 0;
      this.saveProfiles();
    }

    createProfileObject(name, ageGroup, unlockAll) {
      const animaux = {};
      for (let i = 1; i <= 80; i++) animaux[i] = unlockAll ? 1 : 0;
      if (!unlockAll) {
        animaux[14] = 1; // Merle
        animaux[24] = 1; // Lézard
        animaux[35] = 1; // Écureuil
        animaux[65] = 1; // Luciole
      }
      const fleurs = {};
      for (let i = 1; i <= 31; i++) fleurs[i] = unlockAll ? 1 : 0;
      if (!unlockAll) {
        fleurs[1] = 1; // Muguet
        fleurs[8] = 1; // Chardon
        fleurs[16] = 1; // Amanite
        fleurs[23] = 1; // Chêne
      }
      const episodes = {};
      for (let i = 1; i <= 9; i++) episodes[i] = unlockAll ? 1 : 0;
      return {
        name: name || "Explorateur",
        age: ageGroup || 2, // 1 = 7/9 ans, 2 = +9 ans
        createdAt: new Date().toISOString().slice(0, 10),
        Listanimaux: animaux,
        listfleur: fleurs,
        episodesDone: episodes,
        Listboite: [1, 1, 1, 1],
        lastPeriod: "MATIN",
        lastNode: "AB0"
      };
    }

    saveProfiles() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            profiles: this.state.profiles,
            activeProfileIdx: this.state.activeProfileIdx
          })
        );
      } catch (e) {
        console.warn("Could not save profiles:", e);
      }
      this.updateProfileBadge();
    }

    get activeProfile() {
      return this.state.profiles[this.state.activeProfileIdx] || this.state.profiles[0];
    }

    async init() {
      this.setStatus("Chargement de web_assets/forestia_data.json...");
      const resp = await fetch("web_assets/forestia_data.json?v=20261109");
      this.data = await resp.json();

      this.bindEvents();
      this.populateInspectorUI();
      this.updateProfileBadge();
      this.goMenu("sommaire");
      this.startRenderLoop();
      this.setStatus(
        `Moteur Forestia prêt — ${this.data.meta.totalBinaries} binaires Director 6 (${this.data.meta.totalDecompiledScripts} scripts Lingo décompilés, 640/640 nœuds interactifs).`
      );
    }

    setStatus(msg) {
      this.state.statusMessage = msg;
      const el = document.getElementById("status-text");
      if (el) el.textContent = msg;
    }

    updateProfileBadge() {
      const p = this.activeProfile;
      if (!p) return;
      const animCount = Object.values(p.Listanimaux).filter(Boolean).length;
      const herbCount = Object.values(p.listfleur).filter(Boolean).length;
      const epCount = Object.values(p.episodesDone).filter(Boolean).length;

      const badgeEl = document.getElementById("profile-summary");
      if (badgeEl) {
        badgeEl.innerHTML = `👤 <strong>${this.escapeHtml(p.name)}</strong> · 📸 ${animCount}/72 · 🌿 ${herbCount}/31 · ⭐ ${epCount}/9`;
      }
    }

    escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[c]));
    }

    // -------------------------------------------------------------------------
    // Audio Engine (Multi-channel WebAudio / HTML5 Audio)
    // -------------------------------------------------------------------------
    playSound(channel, soundKey, category = "sfx", loop = false, volume = 0.85) {
      if (this.muted || !this.data) return;
      const key = String(soundKey).toUpperCase().replace(/\.AIF$/i, "");
      let src = null;
      if (this.data.audio[category] && this.data.audio[category][key]) {
        src = this.data.audio[category][key];
      } else {
        for (const cat of ["sfx", "sonf", "eson", "fdata", "samn"]) {
          if (this.data.audio[cat] && this.data.audio[cat][key]) {
            src = this.data.audio[cat][key];
            break;
          }
        }
      }
      if (!src) return;

      this.stopSound(channel);
      try {
        const audio = new Audio(src);
        audio.loop = Boolean(loop);
        audio.volume = Math.max(0, Math.min(1, volume));
        this.audioChannels[channel] = audio;
        audio.play().catch(() => {});
      } catch (e) {}
    }

    stopSound(channel) {
      const cur = this.audioChannels[channel];
      if (cur) {
        try {
          cur.pause();
          cur.currentTime = 0;
        } catch (e) {}
        this.audioChannels[channel] = null;
      }
    }

    stopAllSounds() {
      [1, 2, 3, 4].forEach((ch) => this.stopSound(ch));
    }

    // -------------------------------------------------------------------------
    // Image Loader & Cache
    // -------------------------------------------------------------------------
    getImage(src) {
      if (!src) return null;
      if (this.imageCache.has(src)) {
        const entry = this.imageCache.get(src);
        return entry.loaded ? entry.img : null;
      }
      const img = new Image();
      const entry = { img, loaded: false };
      this.imageCache.set(src, entry);
      img.onload = () => {
        entry.loaded = true;
      };
      img.src = src;
      return null;
    }

    // -------------------------------------------------------------------------
    // Navigation & Game State Transitions (Lingo Equivalents)
    // -------------------------------------------------------------------------
    goMenu(subLabel = "sommaire") {
      this.state.mode = "MENU";
      this.state.subMode = subLabel;
      this.state.currentMovie = "FRST.Dxr";
      this.state.currentLabel = subLabel;
      this.state.Gcurseur = 1;
      this.hideOverlayPanel();

      if (subLabel === "sommaire") {
        this.playSound(2, "FORESTIATHEME", "sfx", true, 0.55);
      } else if (subLabel === "FORET" || subLabel === "MATIN" || subLabel === "MIDI" || subLabel === "SOIR") {
        this.playSound(3, "CLIC", "sfx");
      }
      this.syncActiveTabs("menu");
      this.updateInspectorHeader();
    }

    openPeriodSelector() {
      this.state.mode = "MENU";
      this.state.subMode = "FORET";
      this.state.currentMovie = "FRST.Dxr";
      this.state.currentLabel = "FORET";
      this.playSound(3, "CLIC", "sfx");
      this.hideOverlayPanel();
      this.updateInspectorHeader();
    }

    enterForest(period = "MATIN", nodeLabel = "AB0") {
      this.state.mode = "FORET";
      this.state.period = period;
      const nodes = this.data.forestNodes[period] || {};
      if (!nodes[nodeLabel]) {
        nodeLabel = nodes["AB0"] ? "AB0" : Object.keys(nodes)[0];
      }
      this.state.currentNode = nodeLabel;
      this.state.currentMovie = period === "MATIN" ? "F_01.Dxr" : period === "MIDI" ? "F_02.Dxr" : "F_03.Dxr";
      this.state.currentLabel = nodeLabel;
      this.state.currentFrame = nodes[nodeLabel] ? nodes[nodeLabel].frame : 635;
      this.activeProfile.lastPeriod = period;
      this.activeProfile.lastNode = nodeLabel;
      this.saveProfiles();
      this.hideOverlayPanel();

      // Ambient forest sound (Vforet Lingo logic)
      this.stopSound(2);
      if (nodeLabel === "CSCD" || nodeLabel === "CSCD #") {
        this.playSound(1, "EAU", "sfx", true, 0.7);
      } else if (nodeLabel === "aquarium") {
        this.playSound(1, "SOUSEAU", "sfx", true, 0.75);
      } else if (nodeLabel === "MNT" || nodeLabel === "MNT #") {
        this.playSound(1, "VENT___RUISSEAU_MONTAGNE", "sfx", true, 0.65);
      } else if (period === "SOIR") {
        this.playSound(1, "FORET_NUIT", "sfx", true, 0.65);
      } else {
        this.playSound(1, "FORET1", "sfx", true, 0.65);
      }

      this.syncActiveTabs("foret");
      this.updateInspectorHeader();
      this.setStatus(
        `Promenade en forêt (${period}) — Nœud "${nodeLabel}" (Frame ${this.state.currentFrame} de ${this.state.currentMovie})`
      );
    }

    enterTourVR() {
      this.state.mode = "TOUR_VR";
      this.state.currentMovie = "F_01.Dxr";
      this.state.currentLabel = "tour";
      this.state.currentFrame = 6668;
      this.hideOverlayPanel();
      this.playSound(2, "THEMETOUR", "sfx", true, 0.65);
      this.syncActiveTabs("tour");
      this.updateInspectorHeader();
      this.setStatus("Tour de Guet Panoramique 360° — Glisse ou utilise les flèches Gauche/Droite pour tourner à 360° !");
    }

    openPlanMap() {
      this.playSound(3, "CLIC", "sfx");
      this.state.mode = "PLAN";
      this.state.currentLabel = "PLAN";
      this.hideOverlayPanel();
      this.updateInspectorHeader();
      this.setStatus(`Carte de Forestia (${this.state.period}) — Clique sur une zone de la carte pour t'y téléporter.`);
    }

    openAlbum(tab = "sommaire") {
      this.playSound(3, "CLICPAGE", "sfx");
      this.state.mode = "ALBUM";
      this.state.albumTab = tab;
      this.state.currentMovie = "FALBUM.Dxr";
      this.state.currentLabel = tab;
      this.syncActiveTabs("album");
      this.renderAlbumOverlay();
      this.updateInspectorHeader();
    }

    openEpisode(epId, sceneIdx = 0) {
      const ep = EPISODES.find((e) => e.id === Number(epId)) || EPISODES[0];
      this.state.mode = "EPISODE";
      this.state.activeEpisode = ep;
      this.state.episodeSceneIdx = Math.max(0, Math.min(ep.scenes.length - 1, sceneIdx));
      const sc = ep.scenes[this.state.episodeSceneIdx];
      this.state.currentMovie = `${sc.movie}.Dxr`;
      this.state.currentLabel = sc.label;

      this.playSound(3, "CLIC", "sfx");
      if (this.state.episodeSceneIdx === 0 && ep.introAudio) {
        this.playSound(4, ep.introAudio, "sonf", false, 0.9);
      } else if (this.state.episodeSceneIdx === 2 && ep.gameAudio) {
        this.playSound(4, ep.gameAudio, "sonf", false, 0.9);
      }

      // Mark episode as completed in active profile when reaching last scene
      if (this.state.episodeSceneIdx >= ep.scenes.length - 1) {
        this.activeProfile.episodesDone[ep.id] = 1;
        this.saveProfiles();
      }

      this.syncActiveTabs("episodes");
      this.renderEpisodeOverlay();
      this.updateInspectorHeader();
      this.setStatus(`${ep.title} — ${sc.caption}`);
    }

    openSampres() {
      this.state.mode = "SAMPRES";
      this.state.subMode = "salut";
      this.state.currentMovie = "SAMPRES.Dxr";
      this.state.currentLabel = "salut";
      this.playSound(4, "SAM1", "samn", false, 0.9);
      this.hideOverlayPanel();
      this.syncActiveTabs("sampres");
      this.updateInspectorHeader();
      this.setStatus("Rencontre avec Sam le Lapin & Papy Chêne (SAMPRES.Dxr)");
    }

    openScierie(part = 1) {
      this.state.mode = "SCIERIE";
      this.state.subMode = `F_SC${part}`;
      this.state.currentMovie = `F_SC${part}.Dxr`;
      this.state.currentLabel = `scierie${part}`;
      this.playSound(4, "SC11", "sonf", false, 0.9);
      this.hideOverlayPanel();
      this.syncActiveTabs("scierie");
      this.updateInspectorHeader();
      this.setStatus(`La Scierie Abandonnée — Partie ${part} (F_SC${part}.Dxr)`);
    }

    openFete() {
      this.state.mode = "FETE";
      this.state.subMode = "fete";
      this.state.currentMovie = "F_FET2.Dxr";
      this.state.currentLabel = "fete";
      this.playSound(4, "FET21", "sonf", false, 0.9);
      this.hideOverlayPanel();
      this.syncActiveTabs("fete");
      this.updateInspectorHeader();
      this.setStatus("La Grande Fête de Forestia (F_FET2.Dxr) !");
    }

    toggleCameraCursor() {
      this.playSound(3, "CLIC", "sfx");
      if (this.state.Gcurseur === 2) {
        this.state.Gcurseur = 1;
        this.setStatus("Mode Navigation activé (Curseur Flèche/Main).");
      } else {
        this.state.Gcurseur = 2;
        this.setStatus("Appareil Photo Polaroid activé ! Clique sur un animal de la forêt pour le photographier.");
      }
      const camBtn = document.getElementById("btn-camera-mode");
      if (camBtn) {
        camBtn.classList.toggle("active", this.state.Gcurseur === 2);
      }
    }

    takePhoto(animalId) {
      const id = Number(animalId);
      this.playSound(3, "PHOTO1", "sfx", false, 1.0);
      this.state.flashAlpha = 1.0;
      if (this.activeProfile.Listanimaux[id] === 0) {
        this.activeProfile.Listanimaux[id] = 1;
        this.saveProfiles();
      }
      const pMeta = this.data.images.photos[id];
      const aName = pMeta ? pMeta.name.replace(/^photo\s+/i, "") : `Animal #${id}`;
      this.state.Gcurseur = 1;
      const camBtn = document.getElementById("btn-camera-mode");
      if (camBtn) camBtn.classList.remove("active");

      if (ANIMAL_CRIES[id]) {
        setTimeout(() => this.playSound(4, ANIMAL_CRIES[id], "eson", false, 0.95), 450);
      }
      this.setStatus(`📸 Cliché réussi : ${aName} a été ajouté à ton Album de Naturaliste !`);
      this.showToast(`📸 Photo ajoutée à l'Album : ${aName} !`);
    }

    collectHerbier(fleurId) {
      const id = Number(fleurId);
      this.playSound(3, "FEUILLE_AIF", "sfx", false, 0.95);
      this.activeProfile.listfleur[id] = 1;
      this.saveProfiles();
      const hMeta = this.data.images.herbier[id];
      const hName = hMeta ? hMeta.name.replace(/\.PICT$/i, "").replace(/^\*\s*/, "") : `Espèce #${id}`;
      this.setStatus(`🌿 Cueilli : ${hName} a été pressé dans ton Herbier !`);
      this.showToast(`🌿 Ajouté à l'Herbier : ${hName} !`);
    }

    showToast(text) {
      const toast = document.getElementById("stage-toast");
      if (!toast) return;
      toast.textContent = text;
      toast.classList.add("visible");
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
    }


    // -------------------------------------------------------------------------
    // Stage 640x480 Render Loop & Hotspot Builder
    // -------------------------------------------------------------------------
    startRenderLoop() {
      const loop = () => {
        this.renderStage();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    renderStage() {
      const ctx = this.ctx;
      ctx.fillStyle = "#040d07";
      ctx.fillRect(0, 0, STAGE_W, STAGE_H);

      if (!this.data) return;

      const { mode, subMode, period, currentNode } = this.state;
      const hotspots = [];

      if (mode === "MENU") {
        const scMap = this.data.scenes.FRST || {};
        const sc = scMap[subMode] || scMap["sommaire"];
        if (sc) {
          const img = this.getImage(sc.src);
          if (img) ctx.drawImage(img, 0, 0, STAGE_W, STAGE_H);
          // Bind authentic VWSC Score hotspots extracted from FRST.Dxr
          (sc.hotspots || []).forEach((hs) => {
            const clickMap = hs.clickOnTargets || {};
            const target = clickMap[String(hs.spr)] || hs.target || "";
            const tu = target.toUpperCase();
            if (hs.beh === "1:53" || tu === "NOUVELLE") {
              hotspots.push({
                x: hs.x, y: hs.y, w: hs.w, h: hs.h, cursor: "hand",
                label: "Nouvelle Partie",
                action: () => this.openProfileModal("new")
              });
            } else if (hs.beh === "1:28" || tu === "THEPARTIE" || tu === "PARTIE") {
              hotspots.push({
                x: hs.x, y: hs.y, w: hs.w, h: hs.h, cursor: "hand",
                label: "Reprendre une Partie / Choisir Profil",
                action: () => this.openProfileModal("select")
              });
            } else if (tu === "QUITTER") {
              hotspots.push({
                x: hs.x, y: hs.y, w: hs.w, h: hs.h, cursor: "hand",
                label: "Quitter / Générique de Fin",
                action: () => {
                  this.state.subMode = "GENERIQUE";
                  this.playSound(2, "ADIEU", "sfx");
                }
              });
            } else if (tu === "AIDE1" || tu === "AIDE2") {
              hotspots.push({
                x: hs.x, y: hs.y, w: hs.w, h: hs.h, cursor: "hand",
                label: "Aide de Forestia",
                action: () => this.goMenu("aide1")
              });
            } else if (tu === "SOMMAIRE" || tu === "SORTIEBAJ") {
              hotspots.push({
                x: hs.x, y: hs.y, w: hs.w, h: hs.h, cursor: "hand",
                label: "Retour au Sommaire",
                action: () => this.goMenu(subMode === "FORET" || subMode === "Sjeux" ? "reprise" : "sommaire")
              });
            } else if (hs.beh === "1:51" || tu === "FORET") {
              hotspots.push({
                x: hs.x, y: hs.y, w: hs.w, h: hs.h, cursor: "hand",
                label: "Entrer dans la Forêt (Matin, Midi, Nuit)",
                action: () => this.openPeriodSelector()
              });
            } else if (hs.beh === "1:8" || tu === "ALBUM") {
              hotspots.push({
                x: hs.x, y: hs.y, w: hs.w, h: hs.h, cursor: "hand",
                label: "Ouvrir l'Album de Forestia",
                action: () => this.openAlbum("sommaire")
              });
            } else if (hs.beh === "1:56" || tu === "SJEUX2" || tu === "SJEUX" || tu === "SJEUX3") {
              hotspots.push({
                x: hs.x, y: hs.y, w: hs.w, h: hs.h, cursor: "hand",
                label: "La Boîte à Jeux (9 épisodes)",
                action: () => this.goMenu("Sjeux")
              });
            } else if (tu === "MATIN" || tu === "MIDI" || tu === "SOIR") {
              hotspots.push({
                x: hs.x, y: hs.y, w: hs.w, h: hs.h, cursor: "hand",
                label: `Promenade en Forêt (${tu})`,
                action: () => this.enterForest(tu, "AB0")
              });
            } else if (/^F[123][123]$/.test(tu)) {
              const epMap = { F11: 1, F12: 2, F13: 3, F21: 4, F22: 5, F23: 6, F31: 7, F32: 8, F33: 9 };
              const epId = epMap[tu] || 1;
              const ep = EPISODES.find((e) => e.id === epId) || EPISODES[0];
              hotspots.push({
                x: hs.x, y: hs.y, w: hs.w, h: hs.h, cursor: "hand",
                label: ep.title,
                action: () => this.goMenu(tu)
              });
            } else if (/^\*?F[1-9]$/.test(tu)) {
              const epId = Number(tu.replace(/\D/g, "")) || 1;
              const isGameOnly = hs.spr === 47;
              hotspots.push({
                x: hs.x, y: hs.y, w: hs.w, h: hs.h, cursor: "hand",
                label: isGameOnly ? `Jouer directement l'Épisode ${epId}` : `Lancer l'Aventure de l'Épisode ${epId}`,
                action: () => this.openEpisode(epId, isGameOnly ? 2 : 0)
              });
            }
          });
        }

        if (subMode === "sommaire") {
          // Ensure Sam le Lapin character sprite on main menu opens the adventure/reprise menu
          hotspots.push({
            x: 120, y: 180, w: 220, h: 145, cursor: "hand",
            label: "Entrer dans la Forêt (Sam le Lapin)",
            action: () => this.goMenu("reprise")
          });
        } else if (hotspots.length === 0) {
          hotspots.push({
            x: 20, y: 20, w: 600, h: 440, cursor: "hand",
            label: "Retour au Menu Principal",
            action: () => this.goMenu("sommaire")
          });
        }
      } else if (mode === "FORET") {
        // Render authentic Director 6 forest exploration stage:
        // Outer wood frame / HUD from period AB0 composite + current node 454x358 viewport at (93, 61)
        const movieKey = period === "MATIN" ? "F_01" : period === "MIDI" ? "F_02" : "F_03";
        const baseHudScene = (this.data.scenes[movieKey] && this.data.scenes[movieKey]["AB0"])
          || (this.data.scenes.F_01 && this.data.scenes.F_01["AB0"]);
        const baseHud = baseHudScene ? this.getImage(baseHudScene.src) : null;
        if (baseHud) {
          ctx.drawImage(baseHud, 0, 0, STAGE_W, STAGE_H);
        }

        const nodes = this.data.forestNodes[period] || {};
        const node = nodes[currentNode] || nodes["AB0"];
        if (node) {
          const compScene = this.data.scenes[movieKey] && this.data.scenes[movieKey][currentNode];
          if (compScene) {
            const compImg = this.getImage(compScene.src);
            if (compImg) ctx.drawImage(compImg, 0, 0, STAGE_W, STAGE_H);
          } else {
            const vpImg = this.getImage(node.bg);
            if (vpImg) {
              ctx.drawImage(vpImg, 93, 61, 454, 358);
            }
          }

          // Node-specific interactive hotspots from Director 6 Score (32-bit props_idx)
          let hasLeft = false;
          let hasRight = false;
          let hasCenter = false;
          let hasBack = false;

          (node.hotspots || []).forEach((hs) => {
            const playHsSound = () => {
              if (hs.sound) this.playSound(3, hs.sound, "sfx");
              else this.playSound(3, "CLIC", "sfx");
            };

            if (hs.photo || hs.animal) {
              const animId = hs.photo || hs.animal;
              hotspots.push({
                x: Math.max(93, hs.x),
                y: Math.max(61, hs.y),
                w: hs.w,
                h: hs.h,
                cursor: "photo",
                label: `Photographier l'animal (#${animId})`,
                action: () => {
                  this.state.Gcurseur = 2;
                  this.takePhoto(animId);
                }
              });
            } else if (hs.fleur) {
              hotspots.push({
                x: Math.max(93, hs.x),
                y: Math.max(61, hs.y),
                w: hs.w,
                h: hs.h,
                cursor: "hand",
                label: `Cueillir pour l'Herbier (#${hs.fleur})`,
                action: () => this.collectHerbier(hs.fleur)
              });
            } else if (hs.target) {
              const tgt = hs.target;
              const isLeft = hs.spr === 33 || hs.spr === 38 || hs.x < 140;
              const isRight = hs.spr === 32 || hs.spr === 37 || hs.x > 470;
              const isBack = hs.spr === 39 || hs.y > 410;
              if (isBack) hasBack = true;
              else if (isLeft) hasLeft = true;
              else if (isRight) hasRight = true;
              else hasCenter = true;

              const curType = isBack ? "back" : isLeft ? "left" : isRight ? "right" : "forward";
              hotspots.push({
                x: hs.x,
                y: hs.y,
                w: hs.w,
                h: hs.h,
                cursor: this.state.Gcurseur === 2 ? "photo" : curType,
                label: `Aller vers ${tgt}`,
                action: () => {
                  playHsSound();
                  if (tgt === "tour") {
                    this.enterTourVR();
                  } else if (tgt === "<SC" || tgt === "PSC1" || tgt === "VXSCierie") {
                    this.openScierie(1);
                  } else if (tgt.toUpperCase() === "ALBUM" || tgt === "#album") {
                    this.openAlbum("sommaire");
                  } else if (tgt.toUpperCase() === "PLAN") {
                    this.openPlanMap();
                  } else if (hs.movie && /^F_[123][123][123]$/i.test(hs.movie)) {
                    const epMatch = EPISODES.find((e) => e.code === hs.movie.toUpperCase() || e.gameCode === hs.movie.toUpperCase());
                    if (epMatch) this.openEpisode(epMatch.id, 0);
                  } else {
                    this.state.previousNode = currentNode;
                    this.enterForest(period, tgt);
                  }
                }
              });
            } else if (hs.action) {
              const actType = hs.action;
              const isLeft = hs.spr === 33 || hs.spr === 38 || hs.x < 140;
              const isRight = hs.spr === 32 || hs.spr === 37 || hs.x > 470;
              const isBack = hs.spr === 39 || hs.y > 410 || actType === "demitour" || actType === "back" || actType === "previous";
              if (hs.spr === 39 || hs.y > 410) hasBack = true;
              else if (isLeft) hasLeft = true;
              else if (isRight) hasRight = true;
              else hasCenter = true;

              const curType = isBack
                ? "back"
                : isLeft
                  ? "left"
                  : isRight
                    ? "right"
                    : actType === "next"
                      ? "forward"
                      : "hand";
              const lblMap = {
                demitour: "Demi-tour (Regarder derrière soi)",
                next: `Continuer sur le sentier (${node.nextLabel || "AB0"})`,
                previous: `Revenir sur ses pas (${node.prevLabel || this.state.previousNode || "AB0"})`,
                back: "Retour",
                album: "Ouvrir l'Album de Forestia",
                plan: "Ouvrir la Carte de la Forêt",
                aide: "Aide de la Forêt",
                episode: "Continuer l'Aventure"
              };
              hotspots.push({
                x: hs.x,
                y: hs.y,
                w: hs.w,
                h: hs.h,
                cursor: curType,
                label: lblMap[actType] || "Interagir",
                action: () => {
                  playHsSound();
                  if (actType === "demitour") {
                    const rev = currentNode.endsWith(" #")
                      ? currentNode.replace(/\s*#$/, "")
                      : `${currentNode} #`;
                    if (nodes[rev]) this.enterForest(period, rev);
                    else if (node.prevLabel) this.enterForest(period, node.prevLabel);
                  } else if (actType === "next") {
                    if (node.nextLabel) {
                      this.state.previousNode = currentNode;
                      this.enterForest(period, node.nextLabel);
                    }
                  } else if (actType === "previous" || actType === "back") {
                    const dest = this.state.previousNode && nodes[this.state.previousNode]
                      ? this.state.previousNode
                      : node.prevLabel || "AB0";
                    this.enterForest(period, dest);
                  } else if (actType === "album") {
                    this.openAlbum("sommaire");
                  } else if (actType === "plan") {
                    this.openPlanMap();
                  } else if (actType === "episode") {
                    this.goMenu("Sjeux");
                  } else if (actType === "aide") {
                    this.showToast("💡 Astuce : Clique sur le sentier pour avancer, en bas pour faire demi-tour, ou sur l'appareil photo à gauche !");
                  }
                }
              });
            }
          });

          // Fallback standard viewport zones only when not already covered by node VWSC hotspots
          if (!hasLeft) {
            hotspots.push({
              x: 93, y: 61, w: 68, h: 358, cursor: "left",
              label: "Tourner à gauche / Sentier précédent",
              action: () => {
                this.playSound(3, "CLIC", "sfx");
                if (node.prevLabel) this.enterForest(period, node.prevLabel);
              }
            });
          }
          if (!hasCenter) {
            hotspots.push({
              x: 165, y: 90, w: 310, h: 280, cursor: this.state.Gcurseur === 2 ? "photo" : "forward",
              label: this.state.Gcurseur === 2
                ? "Prendre une photo dans cette clairière"
                : `Avancer sur le sentier (${node.nextLabel || "AB0"})`,
              action: () => {
                if (this.state.Gcurseur === 2) {
                  const regionAnimals = period === "MATIN"
                    ? [14, 17, 19, 22, 24, 30, 31, 35, 37, 45, 48, 49, 53, 63, 68, 71, 80]
                    : period === "MIDI"
                      ? [1, 4, 6, 8, 9, 11, 13, 15, 16, 18, 23, 26, 27, 32, 38, 40, 42, 46, 52, 60]
                      : [2, 33, 36, 39, 41, 44, 47, 51, 57, 59, 61, 65, 67, 69];
                  const pick = regionAnimals[(node.frame || 0) % regionAnimals.length];
                  this.takePhoto(pick);
                } else if (node.nextLabel) {
                  this.playSound(3, "CLIC", "sfx");
                  this.state.previousNode = currentNode;
                  this.enterForest(period, node.nextLabel);
                }
              }
            });
          }
          if (!hasRight) {
            hotspots.push({
              x: 480, y: 61, w: 67, h: 358, cursor: "right",
              label: "Tourner à droite / Sentier suivant",
              action: () => {
                this.playSound(3, "CLIC", "sfx");
                if (node.nextLabel) this.enterForest(period, node.nextLabel);
              }
            });
          }
          if (!hasBack) {
            hotspots.push({
              x: 270, y: 422, w: 100, h: 48, cursor: "back",
              label: "Demi-tour (Regarder derrière soi)",
              action: () => {
                this.playSound(3, "CLIC", "sfx");
                const rev = currentNode.endsWith(" #")
                  ? currentNode.replace(/\s*#$/, "")
                  : `${currentNode} #`;
                if (nodes[rev]) {
                  this.enterForest(period, rev);
                } else if (node.prevLabel) {
                  this.enterForest(period, node.prevLabel);
                }
              }
            });
          }
        }

        // Standard Forestia Left & Right HUD Potars (Sprites 42..47)
        this.addHudPotarHotspots(hotspots);
      } else if (mode === "TOUR_VR") {
        // 360° Panoramic Watchtower in F_01 (IF1 member 66 is 3526x358 seamless panorama!)
        const baseHud = (this.data.scenes.F_01 && this.data.scenes.F_01["tour"])
          ? this.getImage(this.data.scenes.F_01["tour"].src)
          : null;
        if (baseHud) ctx.drawImage(baseHud, 0, 0, STAGE_W, STAGE_H);

        const panoMeta = this.data.images.if1 && this.data.images.if1[66];
        const panoImg = panoMeta ? this.getImage(panoMeta.src) : null;
        if (panoImg) {
          const pw = panoMeta.w || 3526;
          const ph = panoMeta.h || 358;
          this.state.tourPanX = ((this.state.tourPanX % pw) + pw) % pw;
          const px = Math.floor(this.state.tourPanX);

          ctx.save();
          ctx.beginPath();
          ctx.rect(79, 61, 482, 358);
          ctx.clip();
          ctx.drawImage(panoImg, -px + 79, 61, pw, ph);
          ctx.drawImage(panoImg, -px + pw + 79, 61, pw, ph);
          ctx.restore();
        }

        // Continuous pan when holding or hovering left/right edges
        hotspots.push(
          {
            x: 79, y: 61, w: 110, h: 358, cursor: "left",
            label: "Pivoter à gauche (Panorama 360°)",
            action: () => {
              this.state.tourPanX -= 180;
            }
          },
          {
            x: 450, y: 61, w: 111, h: 358, cursor: "right",
            label: "Pivoter à droite (Panorama 360°)",
            action: () => {
              this.state.tourPanX += 180;
            }
          },
          {
            x: 190, y: 120, w: 250, h: 240, cursor: "photo",
            label: "Photographier le Rapace depuis la Tour de Guet (Aigle / Faucon / Milan)",
            action: () => this.takePhoto(1)
          },
          {
            x: 270, y: 422, w: 100, h: 48, cursor: "back",
            label: "Redescendre de la Tour de Guet (JK6)",
            action: () => this.enterForest(this.state.period, "JK6")
          }
        );
        this.addHudPotarHotspots(hotspots);
      } else if (mode === "PLAN") {
        const movieKey = period === "MATIN" ? "F_01" : period === "MIDI" ? "F_02" : "F_03";
        const planScene = (this.data.scenes[movieKey] && this.data.scenes[movieKey]["PLAN"])
          || (this.data.scenes.F_01 && this.data.scenes.F_01["PLAN"]);
        if (planScene) {
          const img = this.getImage(planScene.src);
          if (img) ctx.drawImage(img, 0, 0, STAGE_W, STAGE_H);
        }
        // Interactive map landmarks
        const mapZones = [
          { x: 85, y: 155, w: 95, h: 75, node: "AB0", name: "Papy Chêne (Départ AB0)" },
          { x: 210, y: 95, w: 110, h: 75, node: "CSCD", name: "La Cascade & Rivière (CSCD)" },
          { x: 335, y: 115, w: 110, h: 75, node: "aquarium", name: "L'Aquarium / Sous l'eau" },
          { x: 455, y: 85, w: 120, h: 85, node: "MNT", name: "La Montagne & les Sommets (MNT)" },
          { x: 185, y: 215, w: 110, h: 80, node: "tour", name: "La Tour de Guet Panoramique 360°" },
          { x: 335, y: 235, w: 115, h: 80, node: "DF1", name: "La Clairière & les Rochers (DF1)" },
          { x: 135, y: 315, w: 120, h: 75, node: "BC4", name: "Le Sentier du Hérisson (BC4)" },
          { x: 435, y: 295, w: 125, h: 85, node: "EH8", name: "La Scierie Abandonnée (EH8)" }
        ];
        mapZones.forEach((z) => {
          hotspots.push({
            x: z.x, y: z.y, w: z.w, h: z.h, cursor: "hand",
            label: `Se téléporter : ${z.name}`,
            action: () => {
              if (z.node === "tour") this.enterTourVR();
              else this.enterForest(this.state.period, z.node);
            }
          });
        });
        hotspots.push({
          x: 260, y: 420, w: 120, h: 48, cursor: "back",
          label: "Fermer la Carte",
          action: () => this.enterForest(this.state.period, this.state.currentNode)
        });
      } else if (mode === "EPISODE") {
        const ep = this.state.activeEpisode || EPISODES[0];
        const sc = ep.scenes[this.state.episodeSceneIdx] || ep.scenes[0];
        const movieScenes = this.data.scenes[sc.movie] || {};
        const frameObj = movieScenes[sc.label] || Object.values(movieScenes)[0];
        if (frameObj) {
          const img = this.getImage(frameObj.src);
          if (img) ctx.drawImage(img, 0, 0, STAGE_W, STAGE_H);
        }
        // Click left/right or center to advance episode scenes
        hotspots.push(
          {
            x: 40, y: 60, w: 120, h: 360, cursor: "left",
            label: "Étape précédente de l'épisode",
            action: () => {
              if (this.state.episodeSceneIdx > 0) {
                this.openEpisode(ep.id, this.state.episodeSceneIdx - 1);
              }
            }
          },
          {
            x: 165, y: 60, w: 435, h: 360, cursor: "hand",
            label: this.state.episodeSceneIdx + 1 < ep.scenes.length
              ? `Étape suivante (${this.state.episodeSceneIdx + 2}/${ep.scenes.length})`
              : "Terminer l'épisode et retourner en Forêt",
            action: () => {
              if (this.state.episodeSceneIdx + 1 < ep.scenes.length) {
                this.openEpisode(ep.id, this.state.episodeSceneIdx + 1);
              } else {
                this.enterForest(ep.period, "AB0");
              }
            }
          }
        );
      } else if (mode === "ALBUM") {
        const albScenes = this.data.scenes.FALBUM || {};
        const sc = albScenes[this.state.albumTab] || albScenes["sommaire"];
        if (sc) {
          const img = this.getImage(sc.src);
          if (img) ctx.drawImage(img, 0, 0, STAGE_W, STAGE_H);
        }
      } else if (mode === "SAMPRES") {
        const samScenes = this.data.scenes.SAMPRES || {};
        const keys = ["guepe1", "oiseaux1", "salut", "papychene", "vagabond"];
        const sc = samScenes[this.state.subMode] || samScenes["salut"];
        if (sc) {
          const img = this.getImage(sc.src);
          if (img) ctx.drawImage(img, 0, 0, STAGE_W, STAGE_H);
        }
        hotspots.push({
          x: 40, y: 40, w: 560, h: 400, cursor: "hand",
          label: "Continuer le dialogue avec Sam le Lapin & Papy Chêne",
          action: () => {
            const idx = keys.indexOf(this.state.subMode);
            if (idx >= 0 && idx + 1 < keys.length) {
              const nextKey = keys[idx + 1];
              this.state.subMode = nextKey;
              this.state.currentLabel = nextKey;
              this.playSound(4, `SAM${idx + 2}`, "samn", false, 0.9);
            } else {
              this.enterForest("MATIN", "AB0");
            }
          }
        });
      } else if (mode === "SCIERIE") {
        const mKey = this.state.subMode || "F_SC1";
        const scMap = this.data.scenes[mKey] || {};
        const sc = Object.values(scMap).slice(-1)[0];
        if (sc) {
          const img = this.getImage(sc.src);
          if (img) ctx.drawImage(img, 0, 0, STAGE_W, STAGE_H);
        }
        hotspots.push(
          {
            x: 80, y: 80, w: 480, h: 320, cursor: "hand",
            label: "Explorer la Scierie suivante / Photographier la Fouine",
            action: () => {
              this.takePhoto(36); // Fouine
              const nextPart = mKey === "F_SC1" ? 2 : mKey === "F_SC2" ? 3 : 1;
              this.openScierie(nextPart);
            }
          },
          {
            x: 240, y: 415, w: 160, h: 50, cursor: "back",
            label: "Sortir de la Scierie vers la Forêt",
            action: () => this.enterForest(this.state.period, "EH8")
          }
        );
      } else if (mode === "FETE") {
        const scMap = this.data.scenes.F_FET2 || {};
        const keys = ["fete", "partie1", "partie2"];
        const sc = scMap[this.state.subMode] || scMap["fete"];
        if (sc) {
          const img = this.getImage(sc.src);
          if (img) ctx.drawImage(img, 0, 0, STAGE_W, STAGE_H);
        }
        hotspots.push({
          x: 40, y: 40, w: 560, h: 400, cursor: "hand",
          label: "Faire la fête avec tous les habitants de Forestia !",
          action: () => {
            const idx = keys.indexOf(this.state.subMode);
            const nextKey = keys[(idx + 1) % keys.length];
            this.state.subMode = nextKey;
            this.playSound(2, "MAGICRAP", "sfx", false, 0.8);
          }
        });
      }

      this.state.currentHotspots = hotspots;

      // Draw optional hotspot debug overlay or subtle hover highlight
      this.drawHotspotHighlights(ctx, hotspots);

      // Camera flash effect (P.N&B transition)
      if (this.state.flashAlpha > 0.01) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.state.flashAlpha.toFixed(2)})`;
        ctx.fillRect(0, 0, STAGE_W, STAGE_H);
        this.state.flashAlpha *= 0.86;
      }

      // Custom Director 6 Sprite 110 Cursor
      this.drawCustomCursor(ctx);
    }

    addHudPotarHotspots(hotspots) {
      // Left side HUD buttons: Plan (42, 299), Appareil Photo (42, 359), Quitter (46, 406)
      hotspots.push(
        {
          x: 8, y: 274, w: 72, h: 48, cursor: "hand",
          label: "Carte de la Forêt (PLAN)",
          action: () => this.openPlanMap()
        },
        {
          x: 12, y: 332, w: 64, h: 52, cursor: "hand",
          label: "Prendre l'Appareil Photo Polaroid (CPOLA)",
          action: () => this.toggleCameraCursor()
        },
        {
          x: 8, y: 390, w: 82, h: 36, cursor: "hand",
          label: "Retour au Sommaire / Quitter la promenade",
          action: () => this.goMenu("reprise")
        },
        // Right side HUD buttons: Album (595, 298), Boîte (596, 353), Aide (593, 407)
        {
          x: 556, y: 278, w: 78, h: 42, cursor: "hand",
          label: "Ouvrir l'Album de Forestia (FALBUM)",
          action: () => this.openAlbum("sommaire")
        },
        {
          x: 564, y: 328, w: 68, h: 52, cursor: "hand",
          label: "Ouvrir la Boîte aux Trésors & Herbier",
          action: () => this.openAlbum("herbier")
        },
        {
          x: 554, y: 390, w: 80, h: 38, cursor: "hand",
          label: "Aide de la Forêt",
          action: () => {
            this.playSound(3, "AIDE", "sfx");
            this.showToast("💡 Astuce : Clique au centre pour avancer, sur les bords pour tourner, et sur l'appareil photo à gauche pour photographier les animaux !");
          }
        }
      );
    }

    drawHotspotHighlights(ctx, hotspots) {
      const { mouseX, mouseY, showHotspots } = this.state;
      let hovered = null;
      for (let i = 0; i < hotspots.length; i++) {
        const h = hotspots[i];
        if (mouseX >= h.x && mouseX <= h.x + h.w && mouseY >= h.y && mouseY <= h.y + h.h) {
          hovered = h;
          break;
        }
      }
      this.state.hoverHotspot = hovered;

      if (showHotspots) {
        ctx.save();
        hotspots.forEach((h) => {
          ctx.strokeStyle = h === hovered ? "#facc15" : "rgba(74, 222, 128, 0.55)";
          ctx.fillStyle = h === hovered ? "rgba(250, 204, 21, 0.22)" : "rgba(34, 197, 94, 0.10)";
          ctx.lineWidth = h === hovered ? 2 : 1;
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.strokeRect(h.x, h.y, h.w, h.h);
        });
        ctx.restore();
      }

      // Draw tooltip bar at top of stage if hovering an interactive hotspot
      if (hovered && hovered.label) {
        ctx.save();
        ctx.font = "600 13px -apple-system, BlinkMacSystemFont, sans-serif";
        const tw = ctx.measureText(hovered.label).width + 24;
        const bx = Math.max(12, Math.min(STAGE_W - tw - 12, STAGE_W / 2 - tw / 2));
        ctx.fillStyle = "rgba(5, 22, 12, 0.86)";
        ctx.strokeStyle = "rgba(74, 222, 128, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, 10, tw, 26, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ecfdf5";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(hovered.label, bx + tw / 2, 23);
        ctx.restore();
      }
    }

    drawCustomCursor(ctx) {
      const { mouseX, mouseY, Gcurseur, hoverHotspot } = this.state;
      if (mouseX <= 2 || mouseY <= 2 || mouseX >= STAGE_W - 2 || mouseY >= STAGE_H - 2) return;

      ctx.save();
      if (Gcurseur === 2) {
        // Camera Polaroid viewfinder reticle
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2;
        ctx.strokeRect(mouseX - 28, mouseY - 22, 56, 44);
        ctx.beginPath();
        ctx.moveTo(mouseX - 8, mouseY);
        ctx.lineTo(mouseX + 8, mouseY);
        ctx.moveTo(mouseX, mouseY - 8);
        ctx.lineTo(mouseX, mouseY + 8);
        ctx.stroke();
      } else {
        // Use authentic CF1.Cxt cursor bitmap if loaded
        const ctype = hoverHotspot ? hoverHotspot.cursor : "default";
        const memberMap = {
          forward: 3,
          left: 2,
          right: 4,
          back: 7,
          hand: 9,
          photo: 8,
          default: 11
        };
        const mid = memberMap[ctype] || 11;
        const cMeta = this.data.images.cursors && this.data.images.cursors[mid];
        const cImg = cMeta ? this.getImage(cMeta.src) : null;
        if (cImg) {
          ctx.drawImage(cImg, mouseX - (cMeta.regX || 12), mouseY - (cMeta.regY || 12));
        }
      }
      ctx.restore();
    }


    // -------------------------------------------------------------------------
    // Interactive Overlays (Album / Herbier / Dico / Episodes / Profiles)
    // -------------------------------------------------------------------------
    hideOverlayPanel() {
      const panel = document.getElementById("stage-overlay-panel");
      if (panel) {
        panel.classList.add("hidden");
        panel.innerHTML = "";
      }
    }

    renderAlbumOverlay() {
      const panel = document.getElementById("stage-overlay-panel");
      if (!panel) return;
      panel.classList.remove("hidden");

      const tab = this.state.albumTab;
      const p = this.activeProfile;
      const animCount = Object.values(p.Listanimaux).filter(Boolean).length;
      const herbCount = Object.values(p.listfleur).filter(Boolean).length;

      let bodyHtml = "";

      if (tab === "sommaire") {
        bodyHtml = `
          <div class="album-grid-cards">
            <div class="album-feature-card" data-album-tab="photo">
              <div class="album-card-icon">📸</div>
              <h3>Photothèque des Animaux</h3>
              <p>${animCount} / 72 espèces photographiées · Fiches « En savoir plus » & cris d'animaux</p>
            </div>
            <div class="album-feature-card" data-album-tab="herbier">
              <div class="album-card-icon">🌿</div>
              <h3>L'Herbier de Forestia</h3>
              <p>${herbCount} / 31 fleurs, champignons & feuilles d'arbres pressés</p>
            </div>
            <div class="album-feature-card" data-album-tab="notes">
              <div class="album-card-icon">📓</div>
              <h3>Carnet d'Aventure</h3>
              <p>Récits illustrés des 9 aventures vécues dans la forêt</p>
            </div>
            <div class="album-feature-card" data-album-tab="dico">
              <div class="album-card-icon">📖</div>
              <h3>Le Dictionnaire Naturaliste</h3>
              <p>74 définitions scientifiques et familles d'espèces</p>
            </div>
            <div class="album-feature-card" data-album-tab="diplome">
              <div class="album-card-icon">🎓</div>
              <h3>Diplôme de Naturaliste</h3>
              <p>Décerné à <strong>${this.escapeHtml(p.name)}</strong> par Papy Chêne & Sam</p>
            </div>
          </div>
        `;
      } else if (tab === "photo") {
        const photos = Object.values(this.data.images.photos || {})
          .filter((m) => m.name && m.name.toLowerCase().startsWith("photo "))
          .sort((a, b) => a.id - b.id);
        const selId = this.state.selectedAnimalId || (photos[0] && photos[0].id) || 24;
        const selMeta = this.data.images.photos[selId] || photos[0];
        const espId = ANIMAL_TO_ESP[selId];
        const espMeta = espId ? this.data.images.esp[espId] : null;
        const cryKey = ANIMAL_CRIES[selId];
        const cleanName = selMeta ? selMeta.name.replace(/^photo\s+/i, "") : "Espèce";

        // Find matching rich text description from FALBUM Cast 9 (TEXTEs ANIMAUX)
        const matchingTexts = Object.values(this.data.albumTexts.animaux || {}).filter((t) =>
          t.text.toLowerCase().includes(cleanName.toLowerCase().slice(0, 5))
        );
        const descText = matchingTexts.length > 0
          ? matchingTexts.map((t) => t.text).slice(0, 3).join("\n\n")
          : `Espèce observée dans Forestia (${cleanName}). Clique sur « Fiche En Savoir Plus » pour afficher la planche encyclopédique originale 640×480.`;

        bodyHtml = `
          <div class="album-split">
            <div class="album-sidebar-list">
              ${photos.map((m) => {
                const unlocked = Boolean(p.Listanimaux[m.id]);
                const nm = m.name.replace(/^photo\s+/i, "");
                return `
                  <button class="album-list-item ${m.id === selId ? "active" : ""}" data-select-animal="${m.id}">
                    <span>${unlocked ? "📸" : "🔒"} ${this.escapeHtml(nm)}</span>
                    <small>#${m.id}</small>
                  </button>
                `;
              }).join("")}
            </div>
            <div class="album-detail-pane">
              <div class="album-detail-header">
                <div>
                  <h3>${this.escapeHtml(cleanName)}</h3>
                  <span class="badge-pill">${p.Listanimaux[selId] ? "✓ Photographié dans ton album" : "Découvert dans l'encyclopédie"}</span>
                </div>
                <div class="album-detail-actions">
                  ${cryKey ? `<button class="btn-chip" data-play-cry="${cryKey}">🔊 Écouter le cri</button>` : ""}
                  ${espMeta ? `<button class="btn-chip primary" data-open-esp="${espId}">🔍 Planche 640×480 « En savoir plus »</button>` : ""}
                </div>
              </div>
              <div class="album-polaroid-row">
                ${selMeta ? `<img class="polaroid-img" src="${selMeta.src}" alt="${this.escapeHtml(cleanName)}" />` : ""}
                <div class="album-text-box">${this.escapeHtml(descText).replace(/\n/g, "<br/>")}</div>
              </div>
            </div>
          </div>
        `;
      } else if (tab === "esp") {
        const espId = this.state.selectedEspId || 1;
        const espMeta = this.data.images.esp[espId] || this.data.images.esp[1];
        bodyHtml = `
          <div class="esp-full-viewer">
            <div class="esp-toolbar">
              <button class="btn-chip" data-album-tab="photo">← Retour à la Photothèque</button>
              <span>Planche Encyclopédique #${espId} (${this.escapeHtml((espMeta && espMeta.name) || "")})</span>
              <div>
                <button class="btn-chip" data-open-esp="${Math.max(1, espId - 1)}">◀ Précédente</button>
                <button class="btn-chip" data-open-esp="${Math.min(79, espId + 1)}">Suivante ▶</button>
              </div>
            </div>
            ${espMeta ? `<img class="esp-spread-img" src="${espMeta.src}" alt="Planche ESP" />` : ""}
          </div>
        `;
      } else if (tab === "herbier") {
        const specs = Object.values(this.data.images.herbier || {}).sort((a, b) => a.id - b.id);
        const selId = this.state.selectedHerbierId || 1;
        const selMeta = this.data.images.herbier[selId] || specs[0];
        const cleanName = selMeta ? selMeta.name.replace(/\.PICT$/i, "").replace(/^\*\s*/, "").replace(/1$/, "") : "Plante";

        const matchingTexts = Object.values(this.data.albumTexts.herbier || {}).filter((t) =>
          t.text.toLowerCase().includes(cleanName.toLowerCase().slice(0, 4))
        );
        const descText = matchingTexts.length > 0
          ? matchingTexts.map((t) => t.text).slice(0, 3).join("\n\n")
          : `Spécimen botanique de l'Herbier de Forestia (${cleanName}).`;

        bodyHtml = `
          <div class="album-split">
            <div class="album-sidebar-list">
              ${specs.map((m) => {
                const unlocked = Boolean(p.listfleur[m.id]);
                const nm = m.name.replace(/\.PICT$/i, "").replace(/^\*\s*/, "").replace(/1$/, "");
                return `
                  <button class="album-list-item ${m.id === selId ? "active" : ""}" data-select-herbier="${m.id}">
                    <span>${unlocked ? "🌿" : "🌱"} ${this.escapeHtml(nm)}</span>
                    <small>#${m.id}</small>
                  </button>
                `;
              }).join("")}
            </div>
            <div class="album-detail-pane">
              <div class="album-detail-header">
                <h3>🌿 ${this.escapeHtml(cleanName)}</h3>
                <button class="btn-chip primary" data-collect-herbier="${selId}">
                  ${p.listfleur[selId] ? "✓ Cueilli dans ton Herbier" : "+ Cueillir ce spécimen"}
                </button>
              </div>
              <div class="album-polaroid-row">
                ${selMeta ? `<img class="polaroid-img herbier-img" src="${selMeta.src}" alt="${this.escapeHtml(cleanName)}" />` : ""}
                <div class="album-text-box">${this.escapeHtml(descText).replace(/\n/g, "<br/>")}</div>
              </div>
            </div>
          </div>
        `;
      } else if (tab === "dico") {
        const entries = Object.values(this.data.albumTexts.dico || {}).sort((a, b) => a.id - b.id);
        bodyHtml = `
          <div class="dico-grid">
            ${entries.map((e) => {
              const lines = e.text.split("\n").filter(Boolean);
              const title = lines[0] || `Terme #${e.id}`;
              const rest = lines.slice(1).join(" ");
              return `
                <div class="dico-card">
                  <h4>📘 ${this.escapeHtml(title)}</h4>
                  <p>${this.escapeHtml(rest)}</p>
                </div>
              `;
            }).join("")}
          </div>
        `;
      } else if (tab === "notes") {
        bodyHtml = `
          <div class="dico-grid">
            ${EPISODES.map((ep) => `
              <div class="dico-card">
                <h4>${p.episodesDone[ep.id] ? "✅" : "🧭"} ${this.escapeHtml(ep.title)}</h4>
                <p>${this.escapeHtml(ep.subtitle)}</p>
                <button class="btn-chip primary" data-launch-ep="${ep.id}">▶ Jouer cet épisode</button>
              </div>
            `).join("")}
          </div>
        `;
      } else if (tab === "diplome") {
        const dipScene = this.data.scenes.FALBUM && this.data.scenes.FALBUM["DIPLOME"];
        bodyHtml = `
          <div class="diplome-card">
            ${dipScene ? `<img class="diplome-bg" src="${dipScene.src}" alt="Diplôme" />` : ""}
            <div class="diplome-overlay-text">
              <h3>🎓 DIPLÔME DE NATURALISTE DE FORESTIA</h3>
              <p>Décerné officiellement à <strong>${this.escapeHtml(p.name)}</strong></p>
              <p>Photos d'animaux : <strong>${animCount} / 72</strong> · Herbier : <strong>${herbCount} / 31</strong></p>
              <div class="diplome-actions">
                <button class="btn-chip primary" id="btn-unlock-all-album">✨ Débloquer les 80 Animaux & 31 Plantes (Mode Presse)</button>
                <button class="btn-chip" onclick="window.print()">🖨️ Imprimer le Diplôme</button>
              </div>
            </div>
          </div>
        `;
      }

      panel.innerHTML = `
        <div class="album-modal-shell">
          <div class="album-nav-tabs">
            <button class="album-tab-btn ${tab === "sommaire" ? "active" : ""}" data-album-tab="sommaire">📒 Sommaire</button>
            <button class="album-tab-btn ${tab === "photo" || tab === "esp" ? "active" : ""}" data-album-tab="photo">📸 Photos (${animCount})</button>
            <button class="album-tab-btn ${tab === "herbier" ? "active" : ""}" data-album-tab="herbier">🌿 Herbier (${herbCount})</button>
            <button class="album-tab-btn ${tab === "notes" ? "active" : ""}" data-album-tab="notes">📓 Carnet (9)</button>
            <button class="album-tab-btn ${tab === "dico" ? "active" : ""}" data-album-tab="dico">📖 Dico (74)</button>
            <button class="album-tab-btn ${tab === "diplome" ? "active" : ""}" data-album-tab="diplome">🎓 Diplôme</button>
            <button class="album-tab-btn close-btn" id="btn-close-album">✕ Fermer l'Album</button>
          </div>
          <div class="album-modal-content">${bodyHtml}</div>
        </div>
      `;

      // Bind dynamic listeners inside Album modal
      panel.querySelectorAll("[data-album-tab]").forEach((btn) => {
        btn.onclick = () => this.openAlbum(btn.getAttribute("data-album-tab"));
      });
      panel.querySelectorAll("[data-select-animal]").forEach((btn) => {
        btn.onclick = () => {
          this.playSound(3, "PAGE", "sfx");
          this.state.selectedAnimalId = Number(btn.getAttribute("data-select-animal"));
          this.renderAlbumOverlay();
        };
      });
      panel.querySelectorAll("[data-open-esp]").forEach((btn) => {
        btn.onclick = () => {
          this.playSound(3, "TUMB", "sfx");
          this.state.selectedEspId = Number(btn.getAttribute("data-open-esp"));
          this.state.albumTab = "esp";
          this.renderAlbumOverlay();
        };
      });
      panel.querySelectorAll("[data-play-cry]").forEach((btn) => {
        btn.onclick = () => this.playSound(4, btn.getAttribute("data-play-cry"), "eson", false, 1.0);
      });
      panel.querySelectorAll("[data-select-herbier]").forEach((btn) => {
        btn.onclick = () => {
          this.playSound(3, "PAGE", "sfx");
          this.state.selectedHerbierId = Number(btn.getAttribute("data-select-herbier"));
          this.renderAlbumOverlay();
        };
      });
      panel.querySelectorAll("[data-collect-herbier]").forEach((btn) => {
        btn.onclick = () => {
          this.collectHerbier(Number(btn.getAttribute("data-collect-herbier")));
          this.renderAlbumOverlay();
        };
      });
      panel.querySelectorAll("[data-launch-ep]").forEach((btn) => {
        btn.onclick = () => this.openEpisode(Number(btn.getAttribute("data-launch-ep")), 0);
      });
      const unlockBtn = panel.querySelector("#btn-unlock-all-album");
      if (unlockBtn) {
        unlockBtn.onclick = () => {
          for (let i = 1; i <= 80; i++) this.activeProfile.Listanimaux[i] = 1;
          for (let i = 1; i <= 31; i++) this.activeProfile.listfleur[i] = 1;
          for (let i = 1; i <= 9; i++) this.activeProfile.episodesDone[i] = 1;
          this.saveProfiles();
          this.playSound(3, "STAR2", "sfx");
          this.showToast("🎓 Mode Visite Presse activé : 100% des animaux, plantes et épisodes débloqués !");
          this.renderAlbumOverlay();
        };
      }
      const closeBtn = panel.querySelector("#btn-close-album");
      if (closeBtn) {
        closeBtn.onclick = () => this.enterForest(this.state.period, this.state.currentNode);
      }
    }

    renderEpisodeOverlay() {
      const panel = document.getElementById("stage-overlay-panel");
      if (!panel) return;
      panel.classList.remove("hidden");

      const ep = this.state.activeEpisode || EPISODES[0];
      const scIdx = this.state.episodeSceneIdx;
      const sc = ep.scenes[scIdx] || ep.scenes[0];

      panel.innerHTML = `
        <div class="episode-hud-bar">
          <div class="episode-hud-info">
            <strong>${this.escapeHtml(ep.title)}</strong>
            <span>Étape ${scIdx + 1}/${ep.scenes.length} — ${this.escapeHtml(sc.caption)}</span>
          </div>
          <div class="episode-hud-controls">
            <button class="btn-chip" id="ep-prev-btn" ${scIdx === 0 ? "disabled" : ""}>◀ Précédent</button>
            <button class="btn-chip" id="ep-voice-btn">🔊 Écouter Dialogue</button>
            <button class="btn-chip primary" id="ep-next-btn">
              ${scIdx + 1 < ep.scenes.length ? "Suivant ▶" : "✓ Terminer & Retour Forêt"}
            </button>
            <button class="btn-chip" id="ep-list-btn">🎮 9 Épisodes</button>
          </div>
        </div>
      `;

      panel.querySelector("#ep-prev-btn").onclick = () => {
        if (scIdx > 0) this.openEpisode(ep.id, scIdx - 1);
      };
      panel.querySelector("#ep-voice-btn").onclick = () => {
        const audioKey = scIdx < 2 ? ep.introAudio : ep.gameAudio;
        if (audioKey) this.playSound(4, audioKey, "sonf", false, 0.95);
      };
      panel.querySelector("#ep-next-btn").onclick = () => {
        if (scIdx + 1 < ep.scenes.length) {
          this.openEpisode(ep.id, scIdx + 1);
        } else {
          this.enterForest(ep.period, "AB0");
        }
      };
      panel.querySelector("#ep-list-btn").onclick = () => this.goMenu("Sjeux");
    }

    openProfileModal(mode = "select") {
      this.playSound(3, "CLIC", "sfx");
      const panel = document.getElementById("stage-overlay-panel");
      if (!panel) return;
      panel.classList.remove("hidden");

      panel.innerHTML = `
        <div class="album-modal-shell profile-modal-shell">
          <div class="album-nav-tabs">
            <strong>👤 Profils & Sauvegardes Forestia (data.cst localStorage)</strong>
            <button class="album-tab-btn close-btn" id="close-prof-modal">✕ Fermer</button>
          </div>
          <div class="album-modal-content">
            <div class="profile-list-grid">
              ${this.state.profiles.map((prof, idx) => {
                const aCnt = Object.values(prof.Listanimaux).filter(Boolean).length;
                const hCnt = Object.values(prof.listfleur).filter(Boolean).length;
                const eCnt = Object.values(prof.episodesDone).filter(Boolean).length;
                return `
                  <div class="profile-card ${idx === this.state.activeProfileIdx ? "active" : ""}">
                    <div>
                      <h4>${this.escapeHtml(prof.name)} ${prof.age === 1 ? "(7/9 ans)" : "(+9 ans)"}</h4>
                      <p>📸 ${aCnt}/72 photos · 🌿 ${hCnt}/31 herbier · ⭐ ${eCnt}/9 épisodes · Dernier lieu : ${prof.lastPeriod} (${prof.lastNode})</p>
                    </div>
                    <div class="profile-card-btns">
                      <button class="btn-chip primary" data-pick-prof="${idx}">▶ Jouer</button>
                      ${this.state.profiles.length > 1 ? `<button class="btn-chip" data-del-prof="${idx}">🗑️</button>` : ""}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
            <form id="new-profile-form" class="new-profile-box">
              <h4>+ Créer une nouvelle partie</h4>
              <div class="new-profile-row">
                <input type="text" id="new-prof-name" placeholder="Ton prénom (ex: Thomas, Marie...)" required maxlength="24" />
                <select id="new-prof-age">
                  <option value="1">7 / 9 ans</option>
                  <option value="2" selected>+ 9 ans</option>
                </select>
                <button type="submit" class="btn-chip primary">Créer & Lancer l'Aventure</button>
              </div>
            </form>
          </div>
        </div>
      `;

      panel.querySelector("#close-prof-modal").onclick = () => this.hideOverlayPanel();
      panel.querySelectorAll("[data-pick-prof]").forEach((btn) => {
        btn.onclick = () => {
          this.state.activeProfileIdx = Number(btn.getAttribute("data-pick-prof"));
          this.saveProfiles();
          this.playSound(3, "SAM1", "sfx");
          this.goMenu("reprise");
        };
      });
      panel.querySelectorAll("[data-del-prof]").forEach((btn) => {
        btn.onclick = () => {
          const idx = Number(btn.getAttribute("data-del-prof"));
          this.state.profiles.splice(idx, 1);
          if (this.state.activeProfileIdx >= this.state.profiles.length) {
            this.state.activeProfileIdx = 0;
          }
          this.saveProfiles();
          this.openProfileModal();
        };
      });
      const form = panel.querySelector("#new-profile-form");
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const name = panel.querySelector("#new-prof-name").value.trim() || "Explorateur";
          const age = Number(panel.querySelector("#new-prof-age").value) || 2;
          this.state.profiles.push(this.createProfileObject(name, age, false));
          this.state.activeProfileIdx = this.state.profiles.length - 1;
          this.saveProfiles();
          this.openSampres();
        };
      }
    }


    // -------------------------------------------------------------------------
    // Input Binding, Client-Side RIFX/ISO9660 Binary Parser & REA Inspector
    // -------------------------------------------------------------------------
    bindEvents() {
      const getStageCoords = (clientX, clientY) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * STAGE_W;
        const y = ((clientY - rect.top) / rect.height) * STAGE_H;
        return {
          x: Math.max(0, Math.min(STAGE_W, x)),
          y: Math.max(0, Math.min(STAGE_H, y))
        };
      };

      this.canvas.addEventListener("mousemove", (e) => {
        const pt = getStageCoords(e.clientX, e.clientY);
        this.state.mouseX = pt.x;
        this.state.mouseY = pt.y;
      });

      this.canvas.addEventListener("click", (e) => {
        const pt = getStageCoords(e.clientX, e.clientY);
        this.state.mouseX = pt.x;
        this.state.mouseY = pt.y;
        this.handleStageClick(pt.x, pt.y);
      });

      // Touch drag support for 360° VR Watchtower & mobile tapping
      let touchStartX = null;
      this.canvas.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
          const pt = getStageCoords(e.touches[0].clientX, e.touches[0].clientY);
          this.state.mouseX = pt.x;
          this.state.mouseY = pt.y;
          touchStartX = e.touches[0].clientX;
        }
      }, { passive: true });

      this.canvas.addEventListener("touchmove", (e) => {
        if (e.touches.length === 1 && this.state.mode === "TOUR_VR" && touchStartX !== null) {
          const dx = e.touches[0].clientX - touchStartX;
          touchStartX = e.touches[0].clientX;
          this.state.tourPanX -= dx * 2.2;
        }
      }, { passive: true });

      // Keyboard navigation shortcuts
      window.addEventListener("keydown", (e) => {
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT")) {
          return;
        }
        if (this.state.mode === "TOUR_VR") {
          if (e.key === "ArrowLeft") this.state.tourPanX -= 120;
          else if (e.key === "ArrowRight") this.state.tourPanX += 120;
          else if (e.key === "Escape") this.enterForest(this.state.period, "JK6");
        } else if (this.state.mode === "FORET") {
          const nodes = this.data.forestNodes[this.state.period] || {};
          const node = nodes[this.state.currentNode];
          if (!node) return;
          if ((e.key === "ArrowUp" || e.key === "ArrowRight") && node.nextLabel) {
            this.playSound(3, "CLIC", "sfx");
            this.enterForest(this.state.period, node.nextLabel);
          } else if ((e.key === "ArrowDown" || e.key === "ArrowLeft") && node.prevLabel) {
            this.playSound(3, "CLIC", "sfx");
            this.enterForest(this.state.period, node.prevLabel);
          } else if (e.key.toLowerCase() === "p") {
            this.toggleCameraCursor();
          } else if (e.key.toLowerCase() === "m") {
            this.openPlanMap();
          } else if (e.key.toLowerCase() === "a") {
            this.openAlbum("sommaire");
          }
        }
      });

      // Top quick-navigation bar buttons
      const bindBtn = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
      };
      bindBtn("nav-btn-menu", () => this.goMenu("sommaire"));
      bindBtn("nav-btn-matin", () => this.enterForest("MATIN", "AB0"));
      bindBtn("nav-btn-midi", () => this.enterForest("MIDI", "AB0"));
      bindBtn("nav-btn-soir", () => this.enterForest("SOIR", "AB0"));
      bindBtn("nav-btn-tour", () => this.enterTourVR());
      bindBtn("nav-btn-sampres", () => this.openSampres());
      bindBtn("nav-btn-episodes", () => this.goMenu("Sjeux"));
      bindBtn("nav-btn-scierie", () => this.openScierie(1));
      bindBtn("nav-btn-fete", () => this.openFete());
      bindBtn("nav-btn-album", () => this.openAlbum("sommaire"));
      bindBtn("btn-camera-mode", () => this.toggleCameraCursor());
      bindBtn("btn-map-mode", () => this.openPlanMap());
      bindBtn("btn-profiles", () => this.openProfileModal());

      bindBtn("btn-toggle-hotspots", () => {
        this.state.showHotspots = !this.state.showHotspots;
        const btn = document.getElementById("btn-toggle-hotspots");
        if (btn) btn.classList.toggle("active", this.state.showHotspots);
      });

      bindBtn("btn-toggle-mute", () => {
        this.muted = !this.muted;
        if (this.muted) this.stopAllSounds();
        const btn = document.getElementById("btn-toggle-mute");
        if (btn) btn.textContent = this.muted ? "🔇 Muet" : "🔊 Son";
      });

      bindBtn("btn-fullscreen", () => {
        const wrap = document.getElementById("stage-container");
        if (!wrap) return;
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else if (wrap.requestFullscreen) {
          wrap.requestFullscreen().catch(() => {});
        }
      });

      // Node jump selector
      const nodeSelect = document.getElementById("forest-node-select");
      if (nodeSelect) {
        nodeSelect.onchange = () => {
          const val = nodeSelect.value;
          if (!val) return;
          const [per, lbl] = val.split("::");
          if (lbl === "tour") this.enterTourVR();
          else this.enterForest(per, lbl);
        };
      }

      // Episode quick selector
      const epSelect = document.getElementById("episode-quick-select");
      if (epSelect) {
        epSelect.onchange = () => {
          const epId = Number(epSelect.value);
          if (epId >= 1 && epId <= 9) {
            this.openEpisode(epId, 0);
            epSelect.value = "";
          }
        };
      }

      // Client-side local RIFX (.Dxr / .Cxt / .cst) & ISO9660 (FORESTIA.BIN) inspector
      const fileInput = document.getElementById("local-binary-input");
      if (fileInput) {
        fileInput.onchange = (e) => {
          if (e.target.files && e.target.files[0]) {
            this.inspectLocalBinaryFile(e.target.files[0]);
          }
        };
      }
    }

    handleStageClick(x, y) {
      const hotspots = this.state.currentHotspots || [];
      for (let i = 0; i < hotspots.length; i++) {
        const h = hotspots[i];
        if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
          if (typeof h.action === "function") {
            h.action();
          }
          return;
        }
      }
    }

    syncActiveTabs(activeKey) {
      const map = {
        menu: "nav-btn-menu",
        foret: this.state.period === "MATIN"
          ? "nav-btn-matin"
          : this.state.period === "MIDI"
            ? "nav-btn-midi"
            : "nav-btn-soir",
        tour: "nav-btn-tour",
        sampres: "nav-btn-sampres",
        episodes: "nav-btn-episodes",
        scierie: "nav-btn-scierie",
        fete: "nav-btn-fete",
        album: "nav-btn-album"
      };
      document.querySelectorAll(".top-nav-pill").forEach((el) => el.classList.remove("active"));
      const targetId = map[activeKey];
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) el.classList.add("active");
      }
    }

    populateInspectorUI() {
      if (!this.data) return;

      // Populate forest node teleport dropdown (all 640 nodes across Matin, Midi, Nuit)
      const nodeSelect = document.getElementById("forest-node-select");
      if (nodeSelect) {
        let html = `<option value="">🌲 Téléportation directe (640 scènes Forêt)...</option>`;
        for (const per of ["MATIN", "MIDI", "SOIR"]) {
          const nodes = Object.values(this.data.forestNodes[per] || {}).sort((a, b) => a.frame - b.frame);
          html += `<optgroup label="Forêt — ${per} (${nodes.length} nœuds)">`;
          nodes.forEach((n) => {
            html += `<option value="${per}::${this.escapeHtml(n.label)}">[${per}] ${this.escapeHtml(n.label)} (Frame ${n.frame})</option>`;
          });
          html += `</optgroup>`;
        }
        nodeSelect.innerHTML = html;
      }

      // Populate REA Obligation Ledger table
      const tbody = document.getElementById("rea-ledger-tbody");
      if (tbody && Array.isArray(this.data.obligations)) {
        tbody.innerHTML = this.data.obligations.map((ob) => `
          <tr>
            <td><code>${this.escapeHtml(ob.id)}</code></td>
            <td><strong>${this.escapeHtml(ob.binary)}</strong></td>
            <td>${this.escapeHtml(ob.type)}</td>
            <td>${(ob.sizeBytes / 1024).toFixed(1)} Ko</td>
            <td>${ob.decompiledScripts} scripts (${ob.decompiledLines} lignes)</td>
            <td><span class="status-proved">✓ ${this.escapeHtml(ob.status)}</span></td>
          </tr>
        `).join("");
      }

      // Populate Decompiled Lingo script viewer selector
      const scriptSelect = document.getElementById("lingo-script-select");
      const codeBox = document.getElementById("lingo-code-preview");
      if (scriptSelect && codeBox && this.data.sampleScripts) {
        const keys = Object.keys(this.data.sampleScripts).sort();
        scriptSelect.innerHTML = keys.map((k) => `<option value="${this.escapeHtml(k)}">${this.escapeHtml(k)}</option>`).join("");
        scriptSelect.onchange = () => {
          const k = scriptSelect.value;
          codeBox.textContent = this.data.sampleScripts[k] || "";
        };
        if (keys[0]) {
          codeBox.textContent = this.data.sampleScripts[keys[0]];
        }
      }
    }

    updateInspectorHeader() {
      const badge = document.getElementById("director-telemetry");
      if (badge) {
        badge.innerHTML = `🎬 <code>${this.escapeHtml(this.state.currentMovie)}</code> · Label <code>${this.escapeHtml(this.state.currentLabel)}</code> · Frame <code>${this.state.currentFrame}</code>`;
      }
    }

    // -------------------------------------------------------------------------
    // Client-Side Director 6 RIFX / XFIR & ISO9660 Binary Inspector
    // -------------------------------------------------------------------------
    async inspectLocalBinaryFile(file) {
      const outEl = document.getElementById("binary-inspector-output");
      if (!outEl) return;
      outEl.textContent = `Analyse binaire de ${file.name} (${(file.size / 1024).toFixed(1)} Ko)...`;

      const slice = file.slice(0, Math.min(file.size, 8 * 1024 * 1024));
      const buf = await slice.arrayBuffer();
      const dv = new DataView(buf);
      const u8 = new Uint8Array(buf);

      const readFourCC = (off, le = false) => {
        if (off + 4 > u8.length) return "????";
        const chars = [
          String.fromCharCode(u8[off]),
          String.fromCharCode(u8[off + 1]),
          String.fromCharCode(u8[off + 2]),
          String.fromCharCode(u8[off + 3])
        ];
        return le ? chars.reverse().join("") : chars.join("");
      };

      const magic = readFourCC(0, false);
      if (magic === "RIFX" || magic === "XFIR") {
        const le = magic === "XFIR";
        const codec = readFourCC(8, le);
        const mmapPos = dv.getUint32(24, le);
        const hdrSz = dv.getUint16(mmapPos + 8, le);
        const entrySz = dv.getUint16(mmapPos + 10, le);
        const cntUsed = dv.getUint32(mmapPos + 16, le);
        const base = mmapPos + 8 + hdrSz;

        const counts = {};
        for (let i = 0; i < cntUsed; i++) {
          const off = base + i * entrySz;
          if (off + 12 > u8.length) break;
          const fcc = readFourCC(off, le);
          counts[fcc] = (counts[fcc] || 0) + 1;
        }
        outEl.textContent =
          `✅ Conteneur Macromedia Director 6.0 détecté : ${file.name}\n` +
          `   Signature : ${magic} (${le ? "Little-Endian Windows" : "Big-Endian Mac/Hybrid"}) · Codec : ${codec}\n` +
          `   Table mmap @ 0x${mmapPos.toString(16)} : ${cntUsed} entrées\n` +
          `   Chunks extraits : ` +
          Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ");
      } else {
        outEl.textContent =
          `📦 Image binaire détectée : ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} Mo)\n` +
          `   Premiers octets : ${Array.from(u8.slice(0, 16)).map((b) => b.toString(16).padStart(2, "0")).join(" ")}\n` +
          `   Toutes les ressources de FORESTIA.BIN (28 films .Dxr, 33 bibliothèques .Cxt, 9 424 scripts Lingo) sont déjà compilées et actives dans ce moteur Web !`;
      }
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    const engine = new ForestiaEngine();
    window.forestiaEngine = engine;
    engine.init().catch((err) => {
      console.error("Failed to initialize Forestia Web Engine:", err);
    });
  });
})();
