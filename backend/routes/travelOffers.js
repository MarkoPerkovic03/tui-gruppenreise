// backend/routes/travelOffers.js - ERWEITERTE VERSION mit Datenkorrektur

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
    let offers = await TravelOffer.find(query)
      .sort({ createdAt: -1 })
      .lean(); // .lean() für bessere Performance

    console.log(`✅ ${offers.length} TravelOffers gefunden`);
    
    // ✅ NEUE FUNKTION: Korrigiere ungültige Bild-URLs vor dem Senden
    offers = offers.map(offer => {
      const correctedOffer = { ...offer };
      
      // Korrigiere images Array
      if (correctedOffer.images && Array.isArray(correctedOffer.images)) {
        correctedOffer.images = correctedOffer.images
          .map(img => {
            if (typeof img === 'string') {
              return isValidUrl(img) ? { url: img, title: 'Bild', isMain: false } : null;
            } else if (img && typeof img === 'object') {
              return isValidUrl(img.url) ? img : null;
            }
            return null;
          })
          .filter(img => img !== null);
      } else {
        // Keine images vorhanden
        correctedOffer.images = [];
      }

      // Korrigiere mainImage
      if (correctedOffer.images.length > 0) {
        if (!isValidUrl(correctedOffer.mainImage)) {
          correctedOffer.mainImage = correctedOffer.images[0].url;
        }
      } else {
        correctedOffer.mainImage = null;
      }
      
      return correctedOffer;
    });
    
    // Debug: Zeige erste 2 Offers
    if (offers.length > 0) {
      console.log('📋 Erste Angebote:', offers.slice(0, 2).map(offer => ({
        id: offer._id,
        title: offer.title,
        destination: offer.destination,
        price: offer.pricePerPerson,
        hasValidImages: offer.images && offer.images.length > 0,
        mainImage: offer.mainImage,
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

// ✅ NEUE HILFSFUNKTION: URL-Validierung
function isValidUrl(url) {
  try {
    if (!url || typeof url !== 'string') return false;
    const validUrl = new URL(url);
    return validUrl.protocol === 'http:' || validUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

// Helferfunktion zur Vereinheitlichung von TravelOffer-Daten
function normalizeOffer(offer) {
  const correctedOffer = offer.toObject ? { ...offer.toObject() } : { ...offer };

  if (correctedOffer.images && Array.isArray(correctedOffer.images)) {
    correctedOffer.images = correctedOffer.images
      .map(img => {
        if (typeof img === 'string') {
          return isValidUrl(img) ? { url: img, title: 'Bild', isMain: false } : null;
        } else if (img && typeof img === 'object') {
          return isValidUrl(img.url) ? img : null;
        }
        return null;
      })
      .filter(img => img !== null);
  } else {
    correctedOffer.images = [];
  }

  if (correctedOffer.images.length > 0) {
    if (!isValidUrl(correctedOffer.mainImage)) {
      correctedOffer.mainImage = correctedOffer.images[0].url;
    }
  } else {
    correctedOffer.mainImage = null;
  }

  return correctedOffer;
}
// ✅ NEUE ROUTE: Datenbereinigung für Admins
router.post('/admin/fix-images', adminAuth, async (req, res) => {
  try {
    console.log('🔧 Starte Bilddaten-Korrektur...');
    
    const offers = await TravelOffer.find({});
    let correctedCount = 0;
    
    for (const offer of offers) {
      let needsUpdate = false;
      const updates = {};
      
      // Prüfe und korrigiere images Array
      if (offer.images && Array.isArray(offer.images)) {
        const validImages = offer.images.filter(img => {
          const url = typeof img === 'string' ? img : img?.url;
          return isValidUrl(url);
        }).map(img => {
          if (typeof img === 'string') {
            return { url: img, title: 'Bild', isMain: false };
          }
          return img;
        });
        
        if (validImages.length !== offer.images.length || validImages.length === 0) {
          needsUpdate = true;
          
          if (validImages.length === 0) {
            // Erstelle Fallback-Bilder
            updates.images = [{
              url: `https://source.unsplash.com/600x400?${encodeURIComponent(offer.destination || 'hotel')}&fix`,
              title: `${offer.title} - Hauptbild`,
              isMain: true
            }, {
              url: `https://source.unsplash.com/600x400?${encodeURIComponent(offer.category || 'travel')}&fix2`,
              title: `${offer.title} - Nebenbild`,
              isMain: false
            }];
          } else {
            updates.images = validImages;
            updates.images[0].isMain = true; // Erstes Bild als Hauptbild
          }
        }
      } else {
        needsUpdate = true;
        updates.images = [{
          url: `https://source.unsplash.com/600x400?${encodeURIComponent(offer.destination || 'hotel')}&fix`,
          title: `${offer.title} - Hauptbild`,
          isMain: true
        }];
      }
      
      // Prüfe und korrigiere mainImage
      if (!isValidUrl(offer.mainImage)) {
        needsUpdate = true;
        updates.mainImage = updates.images ? updates.images[0].url : 
          `https://source.unsplash.com/600x400?${encodeURIComponent(offer.destination || 'hotel')}&main`;
      }
      
      // Führe Update durch falls nötig
      if (needsUpdate) {
        await TravelOffer.findByIdAndUpdate(offer._id, updates);
        correctedCount++;
        console.log(`✅ Korrigiert: ${offer.title}`);
      }
    }
    
    console.log(`🎉 Bilddaten-Korrektur abgeschlossen: ${correctedCount} von ${offers.length} Angeboten korrigiert`);
    
    res.json({
      success: true,
      message: `Bilddaten-Korrektur abgeschlossen`,
      totalOffers: offers.length,
      correctedOffers: correctedCount
    });
    
  } catch (error) {
    console.error('❌ Fehler bei der Bilddaten-Korrektur:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Bilddaten-Korrektur',
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

    // ✅ VERBESSERTE Bilder-Verarbeitung mit Validierung
    let processedImages = [];
    if (images && images.length > 0) {
      processedImages = images.map((img, index) => {
        let imageUrl = '';
        
        if (typeof img === 'string') {
          imageUrl = img;
        } else if (typeof img === 'object' && img.url) {
          imageUrl = img.url;
        }
        
        // Validiere URL
        if (isValidUrl(imageUrl)) {
          return {
            url: imageUrl,
            title: (typeof img === 'object' && img.title) ? img.title : `Bild ${index + 1}`,
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
      ...(processedImages[0] ? { mainImage: processedImages[0].url } : {}),
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
      price: newOfferData.pricePerPerson,
      imagesCount: newOfferData.images.length,
      mainImage: newOfferData.mainImage
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

// Restliche Routen

// Einzelnes Reiseangebot abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const offer = await TravelOffer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Reiseangebot nicht gefunden' });
    }

    res.json(normalizeOffer(offer));
  } catch (error) {
    console.error('Fehler beim Abrufen des Reiseangebots:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen des Reiseangebots' });
  }
});

// Reiseangebot aktualisieren
router.put('/:id', adminAuth, async (req, res) => {
  try {
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
      tags
    } = req.body;

    const update = { lastModifiedBy: req.userId };

    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description.trim();
    if (destination !== undefined) update.destination = destination.trim();
    if (country !== undefined) update.country = country.trim();
    if (city !== undefined) update.city = city.trim();
    if (category !== undefined) update.category = category;
    if (pricePerPerson !== undefined) update.pricePerPerson = Number(pricePerPerson);
    if (pricePerNight !== undefined) update.pricePerNight = Number(pricePerNight);
    if (minPersons !== undefined) update.minPersons = Number(minPersons);
    if (maxPersons !== undefined) update.maxPersons = Number(maxPersons);
    if (stars !== undefined) update.stars = Number(stars);
    if (tags !== undefined) update.tags = tags;

    if (images) {
      const processedImages = images
        .map((img, idx) => {
          const url = typeof img === 'string' ? img : img.url;
          if (isValidUrl(url)) {
            return {
              url,
              title: typeof img === 'object' && img.title ? img.title : `Bild ${idx + 1}`,
              isMain: img.isMain === true || idx === 0
            };
          }
          return null;
        })
        .filter(Boolean);

      update.images = processedImages;
    }

    const offer = await TravelOffer.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true, context: 'query' }
    );

    if (!offer) {
      return res.status(404).json({ message: 'Reiseangebot nicht gefunden' });
    }

    res.json({ success: true, message: 'Reiseangebot aktualisiert', offer: normalizeOffer(offer) });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Reiseangebots:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Reiseangebots', details: error.message });
  }
});

// Reiseangebot löschen
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const offer = await TravelOffer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Reiseangebot nicht gefunden' });
    }
    res.json({ success: true, message: 'Reiseangebot gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Reiseangebots:', error);
    res.status(500).json({ message: 'Fehler beim Löschen des Reiseangebots' });
  }
});

module.exports = router;