// Test module for validation system - FOR DEVELOPMENT ONLY
// Run in browser console: import('./scripts/test-validators.js').then(m => m.testValidators())

import {
  validatePlayer,
  validatePlayers,
  validateArrow,
  validateArrows,
  validateFormationData,
  validateSettings,
  sanitizeFormationData
} from './validators.js';

/**
 * Test player validation
 */
export function testPlayerValidation() {
  console.log('🧪 Testing player validation...');

  // Valid player
  const validPlayer = { id: 1, nx: 0.5, ny: 0.5, role: 'striker' };
  const result1 = validatePlayer(validPlayer);
  console.assert(result1.valid === true, 'Valid player should pass');
  console.log('✅ Valid player:', result1);

  // Invalid player (NaN coordinates)
  const invalidPlayer1 = { id: 2, nx: NaN, ny: 0.5 };
  const result2 = validatePlayer(invalidPlayer1);
  console.assert(result2.valid === false, 'Player with NaN should fail');
  console.log('✅ Invalid player (NaN):', result2);

  // Invalid player (out of range)
  const invalidPlayer2 = { id: 3, nx: 1.5, ny: -0.2 };
  const result3 = validatePlayer(invalidPlayer2);
  console.assert(result3.valid === false, 'Player with out-of-range coords should fail');
  console.assert(result3.sanitized.nx >= 0 && result3.sanitized.nx <= 1, 'Should sanitize nx');
  console.assert(result3.sanitized.ny >= 0 && result3.sanitized.ny <= 1, 'Should sanitize ny');
  console.log('✅ Invalid player (out of range, sanitized):', result3);

  // Missing required fields
  const invalidPlayer3 = { nx: 0.5, ny: 0.5 };
  const result4 = validatePlayer(invalidPlayer3);
  console.assert(result4.valid === false, 'Player without id should fail');
  console.log('✅ Invalid player (missing id):', result4);

  console.log('✅ Player validation tests complete\n');
}

/**
 * Test players array validation
 */
export function testPlayersValidation() {
  console.log('🧪 Testing players array validation...');

  // Valid players
  const validPlayers = [
    { id: 1, nx: 0.5, ny: 0.3, role: 'striker' },
    { id: 2, nx: 0.3, ny: 0.5, role: 'midfielder' },
    { id: 3, nx: 0.7, ny: 0.5, role: 'midfielder' }
  ];
  const result1 = validatePlayers(validPlayers);
  console.assert(result1.valid === true, 'Valid players array should pass');
  console.log('✅ Valid players:', result1);

  // Mixed valid/invalid
  const mixedPlayers = [
    { id: 1, nx: 0.5, ny: 0.3, role: 'striker' },
    { id: 2, nx: NaN, ny: 0.5 }, // Invalid
    { id: 3, nx: 0.7, ny: 2.0 }  // Invalid
  ];
  const result2 = validatePlayers(mixedPlayers);
  console.assert(result2.valid === false, 'Mixed array should fail validation');
  console.assert(result2.sanitized.length === 3, 'Should still sanitize all players');
  console.log('✅ Mixed players (sanitized):', result2);

  // Too many players
  const tooMany = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    nx: 0.5,
    ny: 0.5
  }));
  const result3 = validatePlayers(tooMany);
  console.assert(result3.valid === false, 'Too many players should fail');
  console.log('✅ Too many players:', result3);

  console.log('✅ Players array validation tests complete\n');
}

/**
 * Test arrow validation
 */
export function testArrowValidation() {
  console.log('🧪 Testing arrow validation...');

  // Valid straight arrow
  const validArrow = {
    id: 'arrow1',
    fromX: 0.3,
    fromY: 0.3,
    toX: 0.7,
    toY: 0.7,
    style: 'solid'
  };
  const result1 = validateArrow(validArrow);
  console.assert(result1.valid === true, 'Valid arrow should pass');
  console.log('✅ Valid arrow:', result1);

  // Valid curved arrow
  const validCurvedArrow = {
    id: 'arrow2',
    fromX: 0.3,
    fromY: 0.3,
    toX: 0.7,
    toY: 0.7,
    c1x: 0.4,
    c1y: 0.5,
    c2x: 0.6,
    c2y: 0.5,
    style: 'comic-flat'
  };
  const result2 = validateArrow(validCurvedArrow);
  console.assert(result2.valid === true, 'Valid curved arrow should pass');
  console.assert(result2.sanitized.curved === true, 'Should mark as curved');
  console.log('✅ Valid curved arrow:', result2);

  // Invalid arrow (bad coordinates)
  const invalidArrow = {
    id: 'arrow3',
    fromX: NaN,
    fromY: 0.3,
    toX: 1.5,
    toY: -0.2
  };
  const result3 = validateArrow(invalidArrow);
  console.assert(result3.valid === false, 'Invalid arrow should fail');
  console.assert(result3.sanitized.fromX >= 0 && result3.sanitized.fromX <= 1, 'Should sanitize');
  console.log('✅ Invalid arrow (sanitized):', result3);

  // Invalid style
  const invalidStyle = {
    id: 'arrow4',
    fromX: 0.3,
    fromY: 0.3,
    toX: 0.7,
    toY: 0.7,
    style: 'invalid-style'
  };
  const result4 = validateArrow(invalidStyle);
  console.assert(result4.valid === false, 'Invalid style should fail');
  console.log('✅ Invalid arrow style:', result4);

  console.log('✅ Arrow validation tests complete\n');
}

/**
 * Test formation data validation
 */
export function testFormationValidation() {
  console.log('🧪 Testing formation data validation...');

  // Valid formation
  const validFormation = {
    name: '4-3-3 Attack',
    players: [
      { id: 1, nx: 0.5, ny: 0.3 },
      { id: 2, nx: 0.3, ny: 0.5 },
      { id: 3, nx: 0.7, ny: 0.5 }
    ],
    arrows: [
      { id: 'arrow1', fromX: 0.5, fromY: 0.3, toX: 0.3, toY: 0.5, style: 'solid' }
    ],
    createdAt: Date.now()
  };
  const result1 = validateFormationData(validFormation);
  console.assert(result1.valid === true, 'Valid formation should pass');
  console.log('✅ Valid formation:', result1);

  // Invalid formation (corrupted players)
  const invalidFormation = {
    name: 'Corrupted',
    players: [
      { id: 1, nx: NaN, ny: NaN },
      { id: 2, nx: 999, ny: -999 }
    ],
    arrows: [],
    createdAt: 'invalid-timestamp'
  };
  const result2 = validateFormationData(invalidFormation);
  console.assert(result2.valid === false, 'Invalid formation should fail');
  console.assert(result2.sanitized !== null, 'Should produce sanitized version');
  console.assert(result2.sanitized.players.length === 2, 'Should sanitize all players');
  console.log('✅ Invalid formation (sanitized):', result2);

  // Test sanitizeFormationData function
  const sanitized = sanitizeFormationData(invalidFormation);
  console.assert(sanitized.players.length === 2, 'Sanitized should have players');
  console.assert(sanitized.players[0].nx >= 0 && sanitized.players[0].nx <= 1, 'Coords should be valid');
  console.log('✅ Sanitized formation:', sanitized);

  console.log('✅ Formation validation tests complete\n');
}

/**
 * Test settings validation
 */
export function testSettingsValidation() {
  console.log('🧪 Testing settings validation...');

  // Valid settings
  const validSettings = {
    orientation: 'landscape',
    passStyle: 'solid',
    passWidth: 4,
    passColor: '#ffd166',
    passRecent: ['#ff0000', '#00ff00']
  };
  const result1 = validateSettings(validSettings);
  console.assert(result1.valid === true, 'Valid settings should pass');
  console.log('✅ Valid settings:', result1);

  // Invalid settings
  const invalidSettings = {
    orientation: 'invalid',
    passStyle: 'wrong-style',
    passWidth: 99,
    passColor: 'not-a-hex',
    passRecent: ['#ff0000', 'invalid', '#00ff00']
  };
  const result2 = validateSettings(invalidSettings);
  console.assert(result2.valid === false, 'Invalid settings should fail');
  console.assert(result2.sanitized.orientation === 'landscape', 'Should use default orientation');
  console.assert(result2.sanitized.passStyle === 'solid', 'Should use default style');
  console.assert(result2.sanitized.passWidth === 4, 'Should use default width');
  console.assert(result2.sanitized.passRecent.length === 2, 'Should filter invalid colors');
  console.log('✅ Invalid settings (sanitized):', result2);

  console.log('✅ Settings validation tests complete\n');
}

/**
 * Test validation with storage/persist modules
 */
export function testStorageIntegration() {
  console.log('🧪 Testing storage integration...');

  // This test requires the actual modules
  import('./storage.js').then(storage => {
    // Try to save invalid preset (should fail)
    try {
      const invalidPlayers = [{ id: 1, nx: NaN, ny: NaN }];
      storage.savePreset('Test Invalid', invalidPlayers);
      console.error('❌ Should have thrown error for invalid preset');
    } catch (error) {
      console.log('✅ Correctly rejected invalid preset:', error.message);
    }

    // Save valid preset (should succeed with toast)
    const validPlayers = [
      { id: 1, nx: 0.5, ny: 0.3 },
      { id: 2, nx: 0.3, ny: 0.5 }
    ];
    storage.savePreset('Test Valid', validPlayers);
    console.log('✅ Saved valid preset (check for success toast)');

    // Load preset and verify validation
    const loaded = storage.getPreset('Test Valid');
    console.assert(loaded !== null, 'Should load preset');
    console.assert(loaded.players.length === 2, 'Should have correct player count');
    console.log('✅ Loaded preset:', loaded);

    // Clean up
    storage.deletePreset('Test Valid');
    console.log('✅ Cleaned up test preset');
  });

  console.log('✅ Storage integration tests scheduled\n');
}

/**
 * Run all validation tests
 */
export function testValidators() {
  console.log('🧪 Running complete validation test suite...\n');

  testPlayerValidation();
  testPlayersValidation();
  testArrowValidation();
  testFormationValidation();
  testSettingsValidation();
  testStorageIntegration();

  console.log('\n✅ All validation tests complete!');
  console.log('Check console for any assertion failures.');
}

// Export to window for easy console access
if (typeof window !== 'undefined') {
  window.testValidators = testValidators;
  window.testPlayerValidation = testPlayerValidation;
  window.testPlayersValidation = testPlayersValidation;
  window.testArrowValidation = testArrowValidation;
  window.testFormationValidation = testFormationValidation;
  window.testSettingsValidation = testSettingsValidation;
  window.testStorageIntegration = testStorageIntegration;
}

console.log('✅ Validation test module loaded');
console.log('Run testValidators() in console to test everything');
