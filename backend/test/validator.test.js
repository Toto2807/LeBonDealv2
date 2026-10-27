import {
    isObjectId,
    assertObjectId,
    assertBodyObject,
    assertAllowedKeys,
    cleanString,
    cleanEnum,
    cleanInteger,
} from '../src/validators/common.js';

const expectInvalid = (fn) => expect(fn).toThrow(expect.objectContaining({ status: 400, code: 'INVALID_INPUT' }));

describe('validators/common', () => {
    test('isObjectId exige exactement 24 caractères hexadécimaux', () => {
        expect(isObjectId('507f1f77bcf86cd799439011')).toBe(true);
        expect(isObjectId('507f1f77bcf86cd79943901')).toBe(false);
        expect(isObjectId('123456789012')).toBe(false); // 12 caractères : accepté à tort par mongoose.isValidObjectId
        expect(isObjectId({ $gt: '' })).toBe(false);
        expect(isObjectId(undefined)).toBe(false);
    });

    test('assertObjectId lève INVALID_INPUT', () => {
        expectInvalid(() => assertObjectId('abc'));
        expect(assertObjectId('507f1f77bcf86cd799439011')).toBe('507f1f77bcf86cd799439011');
    });

    test.each([[undefined], [null], ['texte'], [42], [[]]])('assertBodyObject refuse %p', (body) => {
        expectInvalid(() => assertBodyObject(body));
    });

    test('assertAllowedKeys refuse les propriétés inconnues (id, ownerId...)', () => {
        expect(() => assertAllowedKeys({ titre: 'a' }, ['titre'])).not.toThrow();
        expectInvalid(() => assertAllowedKeys({ titre: 'a', ownerId: 'x' }, ['titre']));
        expectInvalid(() => assertAllowedKeys({ id: 'x' }, ['titre']));
    });

    test('cleanString trim puis contrôle la longueur', () => {
        expect(cleanString('  ok  ', 'Titre', { max: 5 })).toBe('ok');
        expectInvalid(() => cleanString('   ', 'Titre', { max: 5 }));
        expectInvalid(() => cleanString('trop long', 'Titre', { max: 5 }));
        expectInvalid(() => cleanString(12, 'Titre', { max: 5 }));
        expectInvalid(() => cleanString({ $ne: null }, 'Titre', { max: 5 }));
    });

    test('cleanEnum et cleanInteger', () => {
        expect(cleanEnum('a', 'Champ', ['a', 'b'])).toBe('a');
        expectInvalid(() => cleanEnum('c', 'Champ', ['a', 'b']));
        expect(cleanInteger(5, 'Prix', { min: 0, max: 10 })).toBe(5);
        expectInvalid(() => cleanInteger(12.5, 'Prix', { min: 0, max: 100 }));
        expectInvalid(() => cleanInteger('5', 'Prix', { min: 0, max: 10 }));
        expectInvalid(() => cleanInteger(-1, 'Prix', { min: 0, max: 10 }));
        expectInvalid(() => cleanInteger(Number.MAX_SAFE_INTEGER + 2, 'Prix', { min: 0, max: Infinity }));
    });
});
