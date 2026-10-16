import { vocabulary } from '@/mocks/vocabulary';
import { registerRepositories } from '@/services/repositories';
import { createMockRepositories } from '@/services/repositories/mock';

import { getVocabularyById } from './vocabulary';

describe('getVocabularyById', () => {
  beforeEach(() => registerRepositories(createMockRepositories()));

  it('keys every word of a language by id', async () => {
    const byId = await getVocabularyById('de');
    const expected = vocabulary.filter((word) => word.targetLanguage === 'de');
    expect(byId.size).toBe(expected.length);
    expect(byId.get('de-a1-1-w1')?.term).toBe('Hallo');
    expect(byId.get('de-a1-1-w1')?.translations.ar).toBe('مرحباً');
  });

  it('returns an empty map for a language without lessons', async () => {
    const repos = createMockRepositories();
    registerRepositories({ ...repos, lessons: { ...repos.lessons, getByLanguage: async () => [] } });
    expect((await getVocabularyById('de')).size).toBe(0);
  });
});
