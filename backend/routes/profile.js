// routes/profile.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const auth = require('../middleware/auth');
const TravelOffer = require('../models/TravelOffer'); // Falls du TravelOffer Model hast

// @route   GET /api/profile
// @desc    Get current user's profile
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    res.json(user);
  } catch (error) {
    console.error('Fehler beim Laden des Profils:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden des Profils' });
  }
});

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    const { profile } = req.body;

    // Profile-Daten aktualisieren
    if (profile) {
      // Persönliche Daten
      if (profile.firstName !== undefined) user.profile.firstName = profile.firstName;
      if (profile.lastName !== undefined) user.profile.lastName = profile.lastName;
      if (profile.profileImage !== undefined) user.profile.profileImage = profile.profileImage;
      if (profile.phone !== undefined) user.profile.phone = profile.phone;
      if (profile.dateOfBirth !== undefined) user.profile.dateOfBirth = profile.dateOfBirth;
      if (profile.bio !== undefined) user.profile.bio = profile.bio;

      // Adresse
      if (profile.address) {
        user.profile.address = {
          ...user.profile.address,
          ...profile.address
        };
      }

      // Reisevorlieben
      if (profile.travelPreferences) {
        user.profile.travelPreferences = {
          ...user.profile.travelPreferences,
          ...profile.travelPreferences
        };
      }

      // Notfallkontakt
      if (profile.emergencyContact) {
        user.profile.emergencyContact = {
          ...user.profile.emergencyContact,
          ...profile.emergencyContact
        };
      }

      // Benachrichtigungen
      if (profile.notifications) {
        user.profile.notifications = {
          ...user.profile.notifications,
          ...profile.notifications
        };
      }
    }

    await user.save();
    console.log(`✅ Profil aktualisiert für: ${user.email}`);

    res.json(user);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Profils:', error);
    res.status(500).json({ message: 'Server-Fehler beim Aktualisieren des Profils' });
  }
});

// @route   POST /api/profile/upload-image
// @desc    Upload profile image
// @access  Private
router.post('/upload-image', auth, async (req, res) => {
  try {
    const { imageUrl, imageData } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    // In einer echten App würdest du hier das Bild zu einem Cloud-Storage (AWS S3, Cloudinary) hochladen
    // Für die Demo nehmen wir die übergebene URL oder generieren eine zufällige
    const newImageUrl = imageUrl || `https://source.unsplash.com/random?avatar,${user._id},${Date.now()}`;

    user.profile.profileImage = newImageUrl;
    await user.save();

    console.log(`✅ Profilbild aktualisiert für: ${user.email}`);

    res.json({
      message: 'Profilbild erfolgreich hochgeladen',
      profileImage: newImageUrl
    });
  } catch (error) {
    console.error('Fehler beim Hochladen des Profilbildes:', error);
    res.status(500).json({ message: 'Server-Fehler beim Hochladen des Bildes' });
  }
});

// @route   PUT /api/profile/password
// @desc    Change user password
// @access  Private
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    // Aktuelles Passwort prüfen
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Aktuelles Passwort ist falsch' });
    }

    // Neues Passwort validieren
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Neues Passwort muss mindestens 6 Zeichen haben' });
    }

    user.password = newPassword;
    await user.save();

    console.log(`✅ Passwort geändert für: ${user.email}`);

    res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (error) {
    console.error('Fehler beim Ändern des Passworts:', error);
    res.status(500).json({ message: 'Server-Fehler beim Ändern des Passworts' });
  }
});

// @route   GET /api/profile/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await User.getUserStats(req.user.id);
    if (!stats) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    res.json(stats);
  } catch (error) {
    console.error('Fehler beim Laden der Statistiken:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden der Statistiken' });
  }
});

// @route   GET /api/profile/recommendations
// @desc    Get personalized travel recommendations
// @access  Private
router.get('/recommendations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    const preferences = user.profile.travelPreferences;
    if (!preferences) {
      return res.json({
        totalRecommendations: 0,
        offers: [],
        message: 'Vervollständigen Sie Ihre Reisevorlieben für Empfehlungen'
      });
    }

    // Reiseangebote basierend auf Benutzerpräferenzen filtern
    let query = {};

    // Budget-Filter
    if (preferences.budgetRange && preferences.budgetRange.min && preferences.budgetRange.max) {
      query.price = {
        $gte: preferences.budgetRange.min,
        $lte: preferences.budgetRange.max
      };
    }

    // Dauer-Filter
    if (preferences.preferredDuration && preferences.preferredDuration.min && preferences.preferredDuration.max) {
      query.duration = {
        $gte: preferences.preferredDuration.min,
        $lte: preferences.preferredDuration.max
      };
    }

    // Stil-Filter
    if (preferences.travelStyle && preferences.travelStyle.length > 0) {
      query.$or = [
        { travelType: { $in: preferences.travelStyle } },
        { tags: { $in: preferences.travelStyle.map(style => style.toLowerCase()) } }
      ];
    }

    // Finde passende Angebote (falls du TravelOffer Model hast)
    let recommendedOffers = [];
    try {
      recommendedOffers = await TravelOffer.find(query)
        .sort({ rating: -1 })
        .limit(6);
    } catch (modelError) {
      // Falls TravelOffer Model nicht existiert, verwende Mock-Daten
      console.log('TravelOffer Model nicht gefunden, verwende Mock-Daten');
      
      // Mock-Daten für Empfehlungen
      const mockOffers = [
        {
          id: '1',
          title: 'Traumhafte Toskana Tour',
          location: 'Toskana, Italien',
          duration: 7,
          price: 800,
          rating: 4.8,
          image: 'https://source.unsplash.com/random?tuscany',
          tags: ['kultur', 'entspannung'],
          travelType: ['Kultur', 'Entspannung']
        },
        {
          id: '2',
          title: 'Griechische Inselträume',
          location: 'Kykladen, Griechenland',
          duration: 10,
          price: 1200,
          rating: 4.7,
          image: 'https://source.unsplash.com/random?greece',
          tags: ['strand', 'entspannung'],
          travelType: ['Strand', 'Entspannung']
        }
      ];

      // Filtere Mock-Daten basierend auf Präferenzen
      recommendedOffers = mockOffers.filter(offer => {
        const matchesBudget = !preferences.budgetRange || 
          (offer.price >= preferences.budgetRange.min && offer.price <= preferences.budgetRange.max);
        const matchesDuration = !preferences.preferredDuration ||
          (offer.duration >= preferences.preferredDuration.min && offer.duration <= preferences.preferredDuration.max);
        const matchesStyle = !preferences.travelStyle || preferences.travelStyle.length === 0 ||
          preferences.travelStyle.some(style => 
            offer.travelType.includes(style) || offer.tags.includes(style.toLowerCase())
          );

        return matchesBudget && matchesDuration && matchesStyle;
      });
    }

    res.json({
      totalRecommendations: recommendedOffers.length,
      offers: recommendedOffers,
      basedOn: {
        budget: preferences.budgetRange,
        duration: preferences.preferredDuration,
        styles: preferences.travelStyle
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Empfehlungen:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden der Empfehlungen' });
  }
});

// @route   GET /api/profile/public/:userId
// @desc    Get public profile of a user (for group members)
// @access  Private
router.get('/public/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    const publicProfile = user.getPublicProfile();
    res.json(publicProfile);
  } catch (error) {
    console.error('Fehler beim Laden des öffentlichen Profils:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden des Profils' });
  }
});

// @route   DELETE /api/profile
// @desc    Delete user account (deactivate)
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    // Account deaktivieren statt löschen (für Datenintegrität)
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    console.log(`✅ Account deaktiviert für: ${user.email}`);

    res.json({ message: 'Account erfolgreich deaktiviert' });
  } catch (error) {
    console.error('Fehler beim Deaktivieren des Accounts:', error);
    res.status(500).json({ message: 'Server-Fehler beim Deaktivieren des Accounts' });
  }
});

module.exports = router;