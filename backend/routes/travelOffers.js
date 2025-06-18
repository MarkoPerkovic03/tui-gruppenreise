const express = require('express');
const router = express.Router();
const TravelOffer = require('../models/TravelOffer');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// GET /api/travel-offers - Alle verfügbaren Reiseangebote abrufen
router.get('/', auth, async (req, res) => {
  try {
    console.log('🔍 GET /api/travel-offers aufgerufen von User:', req.user?.email);
    
    const { search, country, category, minPrice, maxPrice, minStars, tags } = req.query;
    
    // Build query object
    let query = { available: true };
    
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Country filter
    if (country) {
      query.country = { $regex: country, $options: 'i' };
    }
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Price filter
    if (minPrice || maxPrice) {
      query.pricePerPerson = {};
      if (minPrice) query.pricePerPerson.$gte = Number(minPrice);
      if (maxPrice) query.pricePerPerson.$lte = Number(maxPrice);
    }
    
    // Stars filter
    if (minStars) {
      query.stars = { $gte: Number(minStars) };
    }
    
    // Tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }
    
    console.log('🔎 Query Filter:', query);
    
    // Lade TravelOffers mit Filter
    const offers = await TravelOffer.find(query)
      .sort({ createdAt: -1 })
      .lean(); // .lean() für bessere Performance

    console.log(`✅ ${offers.length} TravelOffers gefunden`);
    
    // Debug: Zeige erste 2 Offers
    if (offers.length > 0) {
      console.log('📋 Erste Angebote:', offers.slice(0, 2).map(offer => ({
        id: offer._id,
        title: offer.title,
        destination: offer.destination,
        price: offer.pricePerPerson,
        hasRequiredFields: !!(offer._id && offer.title && offer.destination && offer.pricePerPerson)
      })));
    }

    // WICHTIG: Korrekte JSON Response
    res.status(200).json({
      success: true,
      total: offers.length,
      offers: offers
    });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen der TravelOffers:', error);
    
    // WICHTIG: Auch bei Fehlern JSON zurückgeben
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Abrufen der Reiseangebote', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// POST /api/travel-offers - Neues Reiseangebot erstellen (nur Admins)
router.post('/', adminAuth, async (req, res) => {
  try {
    console.log('📝 POST /api/travel-offers aufgerufen von Admin:', req.user?.email);
    console.log('📊 Request Body:', req.body);

    const {
      title,
      description,
      destination,
      country,
      city,
      category,
      images,
      pricePerPerson,
      pricePerNight,
      minPersons,
      maxPersons,
      stars,
      amenities,
      tags,
      location,
      availabilityPeriods,
      cancellationPolicy,
      checkInTime,
      checkOutTime
    } = req.body;

    // Validierung der Pflichtfelder
    const requiredFields = [];
    if (!title) requiredFields.push('title');
    if (!description) requiredFields.push('description');
    if (!destination) requiredFields.push('destination');
    if (!country) requiredFields.push('country');
    if (!category) requiredFields.push('category');
    if (!pricePerPerson || pricePerPerson <= 0) requiredFields.push('pricePerPerson');

    if (requiredFields.length > 0) {
      console.log('❌ Validierungsfehler - Fehlende Pflichtfelder:', requiredFields);
      return res.status(400).json({ 
        success: false,
        message: `Pflichtfelder fehlen: ${requiredFields.join(', ')}`,
        missingFields: requiredFields
      });
    }

    // Bilder verarbeiten
    let processedImages = [];
    if (images && images.length > 0) {
      processedImages = images.map((img, index) => {
        if (typeof img === 'string') {
          return {
            url: img,
            title: `Bild ${index + 1}`,
            isMain: index === 0
          };
        } else if (typeof img === 'object' && img.url) {
          return {
            url: img.url,
            title: img.title || `Bild ${index + 1}`,
            isMain: index === 0
          };
        }
        return null;
      }).filter(img => img !== null);
    }

    console.log('🖼️ Verarbeitete Bilder:', processedImages.length);

    // Erstelle neues TravelOffer
    const newOfferData = {
      title: title.trim(),
      description: description.trim(),
      destination: destination.trim(),
      country: country.trim(),
      city: city ? city.trim() : '',
      category,
      images: processedImages,
      pricePerPerson: Number(pricePerPerson),
      pricePerNight: pricePerNight ? Number(pricePerNight) : undefined,
      minPersons: minPersons ? Number(minPersons) : 1,
      maxPersons: maxPersons ? Number(maxPersons) : 10,
      stars: stars ? Number(stars) : 3,
      amenities: amenities || [],
      tags: tags || [],
      location: location || {},
      availabilityPeriods: availabilityPeriods || [],
      cancellationPolicy: cancellationPolicy || 'moderate',
      checkInTime: checkInTime || '15:00',
      checkOutTime: checkOutTime || '11:00',
      createdBy: req.userId,
      available: true,
      bookingCount: 0,
      rating: {
        average: 0,
        count: 0
      }
    };

    console.log('🏗️ Erstelle TravelOffer:', {
      title: newOfferData.title,
      destination: newOfferData.destination,
      price: newOfferData.pricePerPerson
    });

    const newOffer = new TravelOffer(newOfferData);
    const savedOffer = await newOffer.save();
    
    console.log('✅ TravelOffer erfolgreich erstellt:', savedOffer._id);

    res.status(201).json({
      success: true,
      message: 'Reiseangebot erfolgreich erstellt',
      offer: savedOffer
    });

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des TravelOffers:', error);
    
    // Spezifische Fehlerbehandlung
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ein Angebot mit diesen Daten existiert bereits',
        duplicateField: Object.keys(error.keyPattern)[0]
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Erstellen des Reiseangebots', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// GET /api/travel-offers/:id - Einzelnes Reiseangebot abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('🔍 GET /api/travel-offers/:id aufgerufen für ID:', req.params.id);

    // Validiere ObjectId Format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige ID Format'
      });
    }

    const offer = await TravelOffer.findById(req.params.id).lean();

    if (!offer) {
      console.log('❌ TravelOffer nicht gefunden:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Reiseangebot nicht gefunden'
      });
    }

    console.log('✅ TravelOffer gefunden:', offer.title);

    res.json({
      success: true,
      offer: offer
    });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen des TravelOffers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Abrufen des Reiseangebots', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// PUT /api/travel-offers/:id - Reiseangebot aktualisieren (nur Admins)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    console.log('📝 PUT /api/travel-offers/:id aufgerufen für ID:', req.params.id);

    // Validiere ObjectId Format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige ID Format'
      });
    }

    // Aktualisiere lastModifiedBy
    const updateData = {
      ...req.body,
      lastModifiedBy: req.userId
    };

    const offer = await TravelOffer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        lean: true
      }
    );

    if (!offer) {
      console.log('❌ TravelOffer nicht gefunden für Update:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Reiseangebot nicht gefunden'
      });
    }

    console.log('✅ TravelOffer aktualisiert:', offer.title);

    res.json({
      success: true,
      message: 'Reiseangebot erfolgreich aktualisiert',
      offer: offer
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des TravelOffers:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Reiseangebots',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// DELETE /api/travel-offers/:id - Reiseangebot löschen (nur Admins)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    console.log('🗑️ DELETE /api/travel-offers/:id aufgerufen für ID:', req.params.id);

    // Validiere ObjectId Format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige ID Format'
      });
    }

    const offer = await TravelOffer.findById(req.params.id);

    if (!offer) {
      console.log('❌ TravelOffer nicht gefunden für Löschung:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Reiseangebot nicht gefunden'
      });
    }

    // Soft Delete: Setze available auf false statt zu löschen
    offer.available = false;
    await offer.save();

    console.log('✅ TravelOffer deaktiviert:', offer.title);

    res.json({
      success: true,
      message: 'Reiseangebot erfolgreich gelöscht'
    });

  } catch (error) {
    console.error('❌ Fehler beim Löschen des TravelOffers:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Reiseangebots',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// TEST ROUTE - zum Debuggen
router.get('/test/ping', (req, res) => {
  console.log('🧪 TravelOffers Test Route aufgerufen');
  res.json({ 
    success: true,
    message: 'TravelOffers Route funktioniert!',
    timestamp: new Date().toISOString(),
    user: req.user ? {
      id: req.user.id,
      email: req.user.email
    } : 'No user authenticated'
  });
});

// STATISTICS ROUTE - für Admin Dashboard
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    console.log('📊 Admin Stats aufgerufen');

    const stats = await Promise.all([
      TravelOffer.countDocuments({ available: true }),
      TravelOffer.countDocuments({ available: false }),
      TravelOffer.aggregate([
        { $match: { available: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      TravelOffer.aggregate([
        { $match: { available: true } },
        { $group: { _id: null, avgPrice: { $avg: '$pricePerPerson' } } }
      ])
    ]);

    const [activeCount, inactiveCount, categoryStats, priceStats] = stats;

    res.json({
      success: true,
      stats: {
        total: activeCount + inactiveCount,
        active: activeCount,
        inactive: inactiveCount,
        categories: categoryStats,
        averagePrice: priceStats[0]?.avgPrice || 0
      }
    });

  } catch (error) {
    console.error('❌ Fehler beim Laden der Admin Stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

module.exports = router;