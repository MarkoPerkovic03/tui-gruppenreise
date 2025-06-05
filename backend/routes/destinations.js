const express = require('express');
const router = express.Router();
const Destination = require('../models/Destination');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// GET /api/destinations - Alle Reiseziele abrufen (für normale User)
router.get('/', auth, async (req, res) => {
  try {
    const { search, country, tags, minPrice, maxPrice } = req.query;
    
    let query = {};
    
    // Suchfilter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (country) {
      query.country = { $regex: country, $options: 'i' };
    }
    
    if (tags && tags.length > 0) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }
    
    if (minPrice || maxPrice) {
      query.avgPricePerPerson = {};
      if (minPrice) query.avgPricePerPerson.$gte = Number(minPrice);
      if (maxPrice) query.avgPricePerPerson.$lte = Number(maxPrice);
    }

    const destinations = await Destination.find(query)
      .sort({ popularityScore: -1 })
      .limit(100);

    res.json({
      destinations,
      total: destinations.length
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Reiseziele:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Reiseziele', 
      error: error.message 
    });
  }
});

// POST /api/destinations - Neues Reiseziel erstellen (nur Admins)
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      name,
      country,
      city,
      description,
      images,
      avgPricePerPerson,
      tags,
      coordinates
    } = req.body;

    // Validierung
    if (!name || !country) {
      return res.status(400).json({ 
        message: 'Name und Land sind Pflichtfelder' 
      });
    }

    const destination = new Destination({
      name,
      country,
      city: city || '',
      description: description || '',
      images: images || [],
      avgPricePerPerson: avgPricePerPerson || 0,
      tags: tags || [],
      coordinates: coordinates || {},
      popularityScore: 0
    });

    const savedDestination = await destination.save();
    
    res.status(201).json({
      message: 'Reiseziel erfolgreich erstellt',
      destination: savedDestination
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Reiseziels:', error);
    res.status(500).json({ 
      message: 'Fehler beim Erstellen des Reiseziels', 
      error: error.message 
    });
  }
});

// GET /api/destinations/:id - Einzelnes Reiseziel abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);
    
    if (!destination) {
      return res.status(404).json({ message: 'Reiseziel nicht gefunden' });
    }
    
    res.json(destination);
  } catch (error) {
    console.error('Fehler beim Abrufen des Reiseziels:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen des Reiseziels', 
      error: error.message 
    });
  }
});

// PUT /api/destinations/:id - Reiseziel aktualisieren (nur Admins)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const destination = await Destination.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!destination) {
      return res.status(404).json({ message: 'Reiseziel nicht gefunden' });
    }
    
    res.json({
      message: 'Reiseziel erfolgreich aktualisiert',
      destination
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Reiseziels:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren des Reiseziels', 
      error: error.message 
    });
  }
});

// DELETE /api/destinations/:id - Reiseziel löschen (nur Admins)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const destination = await Destination.findByIdAndDelete(req.params.id);
    
    if (!destination) {
      return res.status(404).json({ message: 'Reiseziel nicht gefunden' });
    }
    
    res.json({ message: 'Reiseziel erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Reiseziels:', error);
    res.status(500).json({ 
      message: 'Fehler beim Löschen des Reiseziels', 
      error: error.message 
    });
  }
});

// POST /api/destinations/:id/popularity - Popularität erhöhen
router.post('/:id/popularity', auth, async (req, res) => {
  try {
    const destination = await Destination.findByIdAndUpdate(
      req.params.id,
      { $inc: { popularityScore: 1 } },
      { new: true }
    );
    
    if (!destination) {
      return res.status(404).json({ message: 'Reiseziel nicht gefunden' });
    }
    
    res.json({ message: 'Popularität erhöht', destination });
  } catch (error) {
    console.error('Fehler beim Erhöhen der Popularität:', error);
    res.status(500).json({ 
      message: 'Fehler beim Erhöhen der Popularität', 
      error: error.message 
    });
  }
});

module.exports = router;