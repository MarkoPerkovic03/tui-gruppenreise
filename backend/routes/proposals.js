// backend/routes/proposals.js - OPTIMIERTE VERSION
const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Proposal = require('../models/Proposal');
const Vote = require('../models/Vote');
const Destination = require('../models/Destination');
const TravelOffer = require('../models/TravelOffer');
const auth = require('../middleware/auth');

// GET /api/proposals/group/:groupId - Alle Vorschläge einer Gruppe abrufen
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Prüfe ob User Mitglied der Gruppe ist
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    const isMember = group.members.some(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ message: 'Zugriff verweigert' });
    }
    
    const proposals = await Proposal.find({ group: groupId })
      .populate('destination', 'name country city')
      .populate('proposedBy', 'name email')
      .populate({
        path: 'votes',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 });
    
    res.json(proposals);
  } catch (error) {
    console.error('Fehler beim Laden der Vorschläge:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden der Vorschläge' });
  }
});

// POST /api/proposals - Neuen Reisevorschlag erstellen (NUR AUS TRAVEL OFFERS)
router.post('/', auth, async (req, res) => {
  try {
    const {
      groupId,
      travelOfferId,
      departureDate,
      returnDate,
      description
    } = req.body;
    
    console.log('🆕 Erstelle Proposal aus TravelOffer:', { groupId, travelOfferId, departureDate, returnDate });
    
    // Validierung
    if (!groupId || !travelOfferId || !departureDate || !returnDate) {
      return res.status(400).json({ 
        message: 'Pflichtfelder: groupId, travelOfferId, departureDate, returnDate' 
      });
    }
    
    // Prüfe Gruppenmitgliedschaft
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    const isMember = group.members.some(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ message: 'Nur Gruppenmitglieder können Vorschläge erstellen' });
    }
    
    // Lade das TravelOffer mit allen Daten
    const travelOffer = await TravelOffer.findById(travelOfferId);
    if (!travelOffer) {
      return res.status(404).json({ message: 'Reiseangebot nicht gefunden' });
    }
    
    console.log('📄 TravelOffer gefunden:', {
      title: travelOffer.title,
      destination: travelOffer.destination,
      pricePerPerson: travelOffer.pricePerPerson
    });
    
    // Suche oder erstelle Destination basierend auf TravelOffer
    let destination = await Destination.findOne({ 
      name: travelOffer.destination,
      country: travelOffer.country 
    });
    
    if (!destination) {
      console.log('🌍 Erstelle neue Destination:', travelOffer.destination);
      destination = await Destination.create({
        name: travelOffer.destination,
        country: travelOffer.country,
        city: travelOffer.city || '',
        description: travelOffer.description || '',
        images: travelOffer.images?.map(img => img.url || img) || [],
        avgPricePerPerson: travelOffer.pricePerPerson,
        tags: travelOffer.tags || []
      });
    }
    
    // Berechne Gesamtpreis
    const totalPrice = travelOffer.pricePerPerson * group.maxParticipants;
    
    // Bestimme Meal Plan basierend auf TravelOffer amenities
    let mealPlan = 'breakfast'; // Default
    if (travelOffer.amenities) {
      if (travelOffer.amenities.includes('All-Inclusive')) {
        mealPlan = 'all_inclusive';
      } else if (travelOffer.amenities.includes('Vollpension')) {
        mealPlan = 'full_board';
      } else if (travelOffer.amenities.includes('Halbpension')) {
        mealPlan = 'half_board';
      } else if (travelOffer.amenities.includes('Nur Frühstück')) {
        mealPlan = 'breakfast';
      }
    }
    
    // Erstelle Proposal mit automatisch übernommenen Daten
    const proposal = new Proposal({
      group: groupId,
      destination: destination._id,
      proposedBy: req.user.id,
      
      // AUTOMATISCH AUS TRAVELOFFER ÜBERNOMMEN:
      hotelName: travelOffer.title, // Hotel/Unterkunft Name
      hotelUrl: travelOffer.hotelUrl || '', // Falls vorhanden
      pricePerPerson: travelOffer.pricePerPerson, // Automatisch übernommen!
      totalPrice,
      mealPlan, // Automatisch bestimmt
      
      // VOM USER EINGEGEBEN:
      departureDate: new Date(departureDate),
      returnDate: new Date(returnDate),
      description: description || `${travelOffer.title} - ${travelOffer.destination}`,
      
      // STANDARDWERTE (können später angepasst werden):
      includesFlight: true, // Default
      includesTransfer: true, // Default
      
      // REFERENZ ZUM ORIGINAL TRAVELOFFER:
      originalTravelOffer: travelOfferId // Für spätere Referenz
    });
    
    const savedProposal = await proposal.save();
    console.log('✅ Proposal erstellt:', savedProposal._id);
    
    const populatedProposal = await Proposal.findById(savedProposal._id)
      .populate('destination', 'name country city')
      .populate('proposedBy', 'name email');
    
    res.status(201).json(populatedProposal);
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Vorschlags:', error);
    res.status(500).json({ message: 'Server-Fehler beim Erstellen des Vorschlags' });
  }
});

// POST /api/proposals/:proposalId/vote - Für einen Vorschlag abstimmen
router.post('/:proposalId/vote', auth, async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { rank = 1 } = req.body; // 1 = beste Bewertung, 2 = mittlere, 3 = schlechteste
    
    const proposal = await Proposal.findById(proposalId).populate('group');
    if (!proposal) {
      return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
    }
    
    // Prüfe Gruppenmitgliedschaft
    const isMember = proposal.group.members.some(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ message: 'Nur Gruppenmitglieder können abstimmen' });
    }
    
    // Prüfe ob bereits abgestimmt wurde
    const existingVote = await Vote.findOne({
      proposal: proposalId,
      user: req.user.id
    });
    
    if (existingVote) {
      // Update existing vote
      existingVote.rank = rank;
      await existingVote.save();
    } else {
      // Create new vote
      const vote = new Vote({
        proposal: proposalId,
        user: req.user.id,
        group: proposal.group._id,
        rank: Number(rank)
      });
      
      await vote.save();
      
      // Add vote to proposal
      proposal.votes.push(vote._id);
    }
    
    // Berechne neue Statistiken
    const allVotes = await Vote.find({ proposal: proposalId });
    proposal.voteCount = allVotes.length;
    
    // Gewichtete Punktzahl berechnen (1 = 3 Punkte, 2 = 2 Punkte, 3 = 1 Punkt)
    const totalScore = allVotes.reduce((sum, vote) => {
      return sum + (4 - vote.rank);
    }, 0);
    
    proposal.weightedScore = allVotes.length > 0 ? totalScore / allVotes.length : 0;
    
    await proposal.save();
    
    // Lade aktualisierte Daten
    const updatedProposal = await Proposal.findById(proposalId)
      .populate('destination', 'name country city')
      .populate('proposedBy', 'name email')
      .populate({
        path: 'votes',
        populate: {
          path: 'user',
          select: 'name email'
        }
      });
    
    res.json(updatedProposal);
  } catch (error) {
    console.error('Fehler beim Abstimmen:', error);
    res.status(500).json({ message: 'Server-Fehler beim Abstimmen' });
  }
});

// GET /api/proposals/:proposalId/votes - Abstimmungen eines Vorschlags abrufen
router.get('/:proposalId/votes', auth, async (req, res) => {
  try {
    const { proposalId } = req.params;
    
    const proposal = await Proposal.findById(proposalId).populate('group');
    if (!proposal) {
      return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
    }
    
    // Prüfe Gruppenmitgliedschaft
    const isMember = proposal.group.members.some(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ message: 'Zugriff verweigert' });
    }
    
    const votes = await Vote.find({ proposal: proposalId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(votes);
  } catch (error) {
    console.error('Fehler beim Laden der Abstimmungen:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden der Abstimmungen' });
  }
});

// DELETE /api/proposals/:proposalId - Vorschlag löschen (nur Ersteller oder Gruppenadmin)
router.delete('/:proposalId', auth, async (req, res) => {
  try {
    const { proposalId } = req.params;
    
    const proposal = await Proposal.findById(proposalId).populate('group');
    if (!proposal) {
      return res.status(404).json({ message: 'Vorschlag nicht gefunden' });
    }
    
    // Prüfe Berechtigung (Ersteller oder Gruppenadmin)
    const isCreator = proposal.proposedBy.toString() === req.user.id.toString();
    const isGroupAdmin = proposal.group.members.some(member => 
      member.user.toString() === req.user.id.toString() && member.role === 'admin'
    );
    
    if (!isCreator && !isGroupAdmin) {
      return res.status(403).json({ 
        message: 'Nur der Ersteller oder Gruppenadministratoren können Vorschläge löschen' 
      });
    }
    
    // Lösche alle Abstimmungen zu diesem Vorschlag
    await Vote.deleteMany({ proposal: proposalId });
    
    // Lösche Vorschlag
    await Proposal.findByIdAndDelete(proposalId);
    
    res.json({ message: 'Vorschlag erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Vorschlags:', error);
    res.status(500).json({ message: 'Server-Fehler beim Löschen des Vorschlags' });
  }
});

// POST /api/proposals/group/:groupId/start-voting - Abstimmungsphase starten
router.post('/group/:groupId/start-voting', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { votingDeadline } = req.body;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Prüfe Admin-Berechtigung
    const isAdmin = group.members.some(member => 
      member.user.toString() === req.user.id.toString() && member.role === 'admin'
    );
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Gruppenadministratoren können die Abstimmung starten' });
    }
    
    // Update Gruppe
    group.status = 'voting';
    if (votingDeadline) {
      group.votingDeadline = new Date(votingDeadline);
    }
    
    await group.save();
    
    console.log('🗳️ Abstimmung gestartet für Gruppe:', group.name);
    
    res.json({ message: 'Abstimmungsphase gestartet', group });
  } catch (error) {
    console.error('Fehler beim Starten der Abstimmung:', error);
    res.status(500).json({ message: 'Server-Fehler beim Starten der Abstimmung' });
  }
});

// POST /api/proposals/group/:groupId/end-voting - Abstimmung beenden und Gewinner bestimmen
router.post('/group/:groupId/end-voting', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Prüfe Admin-Berechtigung
    const isAdmin = group.members.some(member => 
      member.user.toString() === req.user.id.toString() && member.role === 'admin'
    );
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Gruppenadministratoren können die Abstimmung beenden' });
    }
    
    // Finde Vorschlag mit höchster gewichteter Punktzahl
    const proposals = await Proposal.find({ group: groupId })
      .populate('destination', 'name country city')
      .sort({ weightedScore: -1, voteCount: -1 });
    
    if (proposals.length === 0) {
      return res.status(400).json({ message: 'Keine Vorschläge vorhanden' });
    }
    
    const winningProposal = proposals[0];
    
    // Update Gruppe
    group.status = 'decided';
    group.winningProposal = winningProposal._id;
    
    await group.save();
    
    console.log('🏆 Abstimmung beendet - Gewinner:', winningProposal.destination.name);
    
    res.json({ 
      message: 'Abstimmung beendet', 
      group,
      winningProposal: winningProposal
    });
  } catch (error) {
    console.error('Fehler beim Beenden der Abstimmung:', error);
    res.status(500).json({ message: 'Server-Fehler beim Beenden der Abstimmung' });
  }
});

module.exports = router;