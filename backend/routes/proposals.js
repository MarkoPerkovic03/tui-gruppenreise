// backend/routes/proposals.js - ENHANCED VERSION mit Tie-Breaking
const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Proposal = require('../models/Proposal');
const Vote = require('../models/Vote');
const Destination = require('../models/Destination');
const TravelOffer = require('../models/TravelOffer');
const auth = require('../middleware/auth');

// GET /api/proposals/group/:groupId - Alle Vorschläge einer Gruppe mit Tie-Breaking
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { includeTieInfo = false } = req.query;
    
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
    
    // Verwende erweiterte Tie-Breaking-Logik wenn angefordert
    if (includeTieInfo === 'true') {
      const result = await Proposal.findByGroupWithTieBreaking(groupId);
      return res.json({
        proposals: result.proposals,
        tieInfo: result.tieInfo
      });
    }
    
    // Standard-Laden ohne Tie-Breaking-Info
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
    
    // Berechne Enhanced Scores für alle Proposals
    for (const proposal of proposals) {
      await proposal.calculateEnhancedScore();
    }
    
    res.json(proposals);
  } catch (error) {
    console.error('Fehler beim Laden der Vorschläge:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden der Vorschläge' });
  }
});

// GET /api/proposals/group/:groupId/results - Ergebnisse mit vollem Tie-Breaking
router.get('/group/:groupId/results', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Prüfe Gruppenmitgliedschaft
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
    
    // Lade alle Proposals mit erweiterte Tie-Breaking-Analyse
    const result = await Proposal.findByGroupWithTieBreaking(groupId);
    
    // Zusätzliche Statistiken berechnen
    const totalVotes = result.proposals.reduce((sum, p) => sum + (p.voteCount || 0), 0);
    const avgScore = result.proposals.length > 0 
      ? result.proposals.reduce((sum, p) => sum + (p.weightedScore || 0), 0) / result.proposals.length 
      : 0;
    
    const statistics = {
      totalProposals: result.proposals.length,
      totalVotes,
      avgScore: Math.round(avgScore * 100) / 100,
      hasDecision: group.status === 'decided',
      winner: group.winningProposal ? 
        result.proposals.find(p => p._id.toString() === group.winningProposal.toString()) : 
        null
    };
    
    res.json({
      proposals: result.proposals,
      tieInfo: result.tieInfo,
      statistics,
      group: {
        status: group.status,
        votingDeadline: group.votingDeadline,
        winningProposal: group.winningProposal
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Abstimmungsergebnisse:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden der Ergebnisse' });
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
      hotelName: travelOffer.title,
      hotelUrl: travelOffer.hotelUrl || '',
      pricePerPerson: travelOffer.pricePerPerson,
      totalPrice,
      mealPlan,
      
      // VOM USER EINGEGEBEN:
      departureDate: new Date(departureDate),
      returnDate: new Date(returnDate),
      description: description || `${travelOffer.title} - ${travelOffer.destination}`,
      
      // STANDARDWERTE:
      includesFlight: true,
      includesTransfer: true,
      
      // REFERENZ ZUM ORIGINAL TRAVELOFFER:
      originalTravelOffer: travelOfferId,
      
      // INITIALISIERE TIE-BREAKING FELDER:
      voteDistribution: { 1: 0, 2: 0, 3: 0 },
      voteCount: 0,
      weightedScore: 0
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

// POST /api/proposals/:proposalId/vote - Für einen Vorschlag abstimmen (ENHANCED)
router.post('/:proposalId/vote', auth, async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { rank = 1 } = req.body;
    
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
    
    // Berechne neue Enhanced Statistiken
    await proposal.calculateEnhancedScore();
    
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

// POST /api/proposals/group/:groupId/start-voting - Abstimmungsphase starten (ENHANCED)
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
    
    // Berechne Enhanced Scores für alle existierenden Proposals
    const proposals = await Proposal.find({ group: groupId });
    for (const proposal of proposals) {
      await proposal.calculateEnhancedScore();
    }
    
    // Update Gruppe
    group.status = 'voting';
    if (votingDeadline) {
      group.votingDeadline = new Date(votingDeadline);
    }
    
    await group.save();
    
    console.log('🗳️ Abstimmung gestartet für Gruppe:', group.name);
    
    res.json({ 
      message: 'Abstimmungsphase gestartet', 
      group,
      proposalCount: proposals.length 
    });
  } catch (error) {
    console.error('Fehler beim Starten der Abstimmung:', error);
    res.status(500).json({ message: 'Server-Fehler beim Starten der Abstimmung' });
  }
});

// POST /api/proposals/group/:groupId/end-voting - Abstimmung beenden mit Enhanced Tie-Breaking
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
    
    // Verwende Enhanced Tie-Breaking zur Gewinner-Ermittlung
    const result = await Proposal.findByGroupWithTieBreaking(groupId);
    
    if (result.proposals.length === 0) {
      return res.status(400).json({ message: 'Keine Vorschläge vorhanden' });
    }
    
    const winningProposal = result.proposals[0];
    
    // Update Gruppe mit Gewinner
    group.status = 'decided';
    group.winningProposal = winningProposal._id;
    
    await group.save();
    
    console.log('🏆 Abstimmung beendet - Gewinner:', winningProposal.destination.name);
    console.log('📊 Tie-Breaking Info:', result.tieInfo);
    
    res.json({ 
      message: 'Abstimmung beendet', 
      group,
      winningProposal: winningProposal,
      tieInfo: result.tieInfo,
      allProposals: result.proposals
    });
  } catch (error) {
    console.error('Fehler beim Beenden der Abstimmung:', error);
    res.status(500).json({ message: 'Server-Fehler beim Beenden der Abstimmung' });
  }
});

// GET /api/proposals/:proposalId/votes - Abstimmungen eines Vorschlags abrufen (ENHANCED)
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
    
    // Erweiterte Statistiken hinzufügen
    const voteDistribution = { 1: 0, 2: 0, 3: 0 };
    votes.forEach(vote => {
      voteDistribution[vote.rank] = (voteDistribution[vote.rank] || 0) + 1;
    });
    
    const avgRank = votes.length > 0 
      ? votes.reduce((sum, vote) => sum + vote.rank, 0) / votes.length 
      : 0;
    
    res.json({
      votes,
      statistics: {
        totalVotes: votes.length,
        voteDistribution,
        averageRank: Math.round(avgRank * 100) / 100,
        weightedScore: proposal.weightedScore || 0
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Abstimmungen:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden der Abstimmungen' });
  }
});

// GET /api/proposals/:proposalId/tie-breaking-info - Detaillierte Tie-Breaking Info
router.get('/:proposalId/tie-breaking-info', auth, async (req, res) => {
  try {
    const { proposalId } = req.params;
    
    const proposal = await Proposal.findById(proposalId)
      .populate('group')
      .populate('destination', 'name country city')
      .populate('proposedBy', 'name email');
    
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
    
    // Berechne aktuelle Enhanced Scores
    await proposal.calculateEnhancedScore();
    
    // Hole alle Proposals der Gruppe für Vergleich
    const allProposals = await Proposal.find({ group: proposal.group._id });
    for (const p of allProposals) {
      await p.calculateEnhancedScore();
    }
    
    // Ermittle Ranking
    const sortedProposals = allProposals.sort((a, b) => {
      if (Math.abs(b.weightedScore - a.weightedScore) > 0.001) {
        return (b.weightedScore || 0) - (a.weightedScore || 0);
      }
      return (b.voteCount || 0) - (a.voteCount || 0);
    });
    
    const ranking = sortedProposals.findIndex(p => p._id.toString() === proposalId) + 1;
    
    res.json({
      proposal: proposal.getTieBreakingInfo(),
      ranking: ranking,
      totalProposals: allProposals.length,
      isWinner: ranking === 1,
      tiedWith: sortedProposals.filter(p => 
        Math.abs(p.weightedScore - proposal.weightedScore) < 0.001 && 
        p._id.toString() !== proposalId
      ).map(p => ({
        id: p._id,
        destination: p.destination?.name,
        weightedScore: p.weightedScore
      }))
    });
  } catch (error) {
    console.error('Fehler beim Laden der Tie-Breaking-Info:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden der Tie-Breaking-Info' });
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
    
    // Aktualisiere Enhanced Scores für verbleibende Proposals
    const remainingProposals = await Proposal.find({ group: proposal.group._id });
    for (const p of remainingProposals) {
      await p.calculateEnhancedScore();
    }
    
    res.json({ 
      message: 'Vorschlag erfolgreich gelöscht',
      remainingProposals: remainingProposals.length 
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Vorschlags:', error);
    res.status(500).json({ message: 'Server-Fehler beim Löschen des Vorschlags' });
  }
});

module.exports = router;