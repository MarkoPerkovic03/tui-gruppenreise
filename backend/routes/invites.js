// backend/routes/invites.js - Einladungslink System
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Group = require('../models/Group');
const User = require('../models/user');
const auth = require('../middleware/auth');

// @route   POST /api/invites/generate
// @desc    Generate invite link for a group
// @access  Private (Admin only)
router.post('/generate', auth, async (req, res) => {
  try {
    const { groupId, expiresInDays = 7 } = req.body;
    
    console.log('🔗 Generiere Einladungslink für Gruppe:', groupId);
    
    // Lade Gruppe und prüfe Admin-Berechtigung
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Prüfe ob User Admin der Gruppe ist
    const userMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Nur Gruppen-Admins können Einladungslinks generieren' 
      });
    }
    
    // Generiere unique Token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    // Setze Ablaufzeit
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    // Speichere Token in der Gruppe
    group.inviteToken = inviteToken;
    group.inviteTokenExpires = expiresAt;
    await group.save();
    
    console.log('✅ Einladungslink generiert:', { token: inviteToken, expires: expiresAt });
    
    res.json({
      success: true,
      inviteToken,
      inviteUrl: `${req.protocol}://${req.get('host')}/invite/${inviteToken}`,
      expiresAt,
      message: 'Einladungslink erfolgreich generiert'
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Generieren des Einladungslinks:', error);
    res.status(500).json({ 
      message: 'Fehler beim Generieren des Einladungslinks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// @route   GET /api/invites/:token
// @desc    Get invite details by token
// @access  Public (but token required)
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 Prüfe Einladungstoken:', token);
    
    // Finde Gruppe mit diesem Token
    const group = await Group.findOne({ 
      inviteToken: token,
      inviteTokenExpires: { $gt: new Date() } // Token noch nicht abgelaufen
    })
    .populate('creator', 'name email')
    .populate('members.user', 'name email');
    
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Einladungslink ist ungültig oder abgelaufen',
        expired: true
      });
    }
    
    // Prüfe ob Gruppe noch Plätze frei hat
    const hasSpace = group.members.length < group.maxParticipants;
    
    console.log('✅ Gültige Einladung gefunden für Gruppe:', group.name);
    
    res.json({
      success: true,
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        creator: group.creator,
        memberCount: group.members.length,
        maxParticipants: group.maxParticipants,
        hasSpace,
        travelDateFrom: group.travelDateFrom,
        travelDateTo: group.travelDateTo,
        budgetMin: group.budgetMin,
        budgetMax: group.budgetMax,
        preferences: group.preferences,
        status: group.status
      },
      canJoin: hasSpace,
      expiresAt: group.inviteTokenExpires
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Prüfen der Einladung:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Prüfen der Einladung',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// @route   POST /api/invites/:token/join
// @desc    Join group via invite link
// @access  Private
router.post('/:token/join', auth, async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('👥 User versucht Gruppe beizutreten via Token:', token);
    
    // Finde Gruppe mit diesem Token
    const group = await Group.findOne({ 
      inviteToken: token,
      inviteTokenExpires: { $gt: new Date() }
    });
    
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Einladungslink ist ungültig oder abgelaufen'
      });
    }
    
    // Prüfe ob User bereits Mitglied ist
    const isAlreadyMember = group.members.some(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (isAlreadyMember) {
      return res.status(400).json({ 
        success: false,
        message: 'Sie sind bereits Mitglied dieser Gruppe'
      });
    }
    
    // Prüfe ob noch Plätze frei sind
    if (group.members.length >= group.maxParticipants) {
      return res.status(400).json({ 
        success: false,
        message: 'Die Gruppe ist bereits voll'
      });
    }
    
    // Füge User zur Gruppe hinzu
    group.members.push({
      user: req.user.id,
      role: 'member',
      joinedAt: new Date()
    });
    
    await group.save();
    
    console.log('✅ User erfolgreich zur Gruppe hinzugefügt:', req.user.email);
    
    // Lade aktualisierte Gruppe für Response
    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email');
    
    res.json({
      success: true,
      message: `Willkommen in der Gruppe "${group.name}"!`,
      group: updatedGroup
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Beitreten zur Gruppe:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Beitreten zur Gruppe',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// @route   DELETE /api/invites/:groupId/revoke
// @desc    Revoke (deactivate) invite link for a group
// @access  Private (Admin only)
router.delete('/:groupId/revoke', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    console.log('🚫 Widerrufe Einladungslink für Gruppe:', groupId);
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Prüfe Admin-Berechtigung
    const userMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Nur Gruppen-Admins können Einladungslinks widerrufen' 
      });
    }
    
    // Entferne Token
    group.inviteToken = undefined;
    group.inviteTokenExpires = undefined;
    await group.save();
    
    console.log('✅ Einladungslink widerrufen');
    
    res.json({
      success: true,
      message: 'Einladungslink wurde widerrufen'
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Widerrufen des Einladungslinks:', error);
    res.status(500).json({ 
      message: 'Fehler beim Widerrufen des Einladungslinks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// @route   GET /api/invites/group/:groupId/current
// @desc    Get current invite link for a group
// @access  Private (Admin only)
router.get('/group/:groupId/current', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Prüfe Admin-Berechtigung
    const userMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Nur Gruppen-Admins können Einladungslinks einsehen' 
      });
    }
    
    // Prüfe ob aktiver Einladungslink existiert
    const hasActiveInvite = group.inviteToken && 
                           group.inviteTokenExpires && 
                           group.inviteTokenExpires > new Date();
    
    if (hasActiveInvite) {
      res.json({
        success: true,
        hasActiveInvite: true,
        inviteToken: group.inviteToken,
        inviteUrl: `${req.protocol}://${req.get('host')}/invite/${group.inviteToken}`,
        expiresAt: group.inviteTokenExpires
      });
    } else {
      res.json({
        success: true,
        hasActiveInvite: false,
        message: 'Kein aktiver Einladungslink vorhanden'
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Abrufen des Einladungslinks:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen des Einladungslinks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

module.exports = router;