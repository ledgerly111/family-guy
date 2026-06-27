import characters from '@/data/characters.json'
import quotes from '@/data/quotes.json'

export async function getAllCharacters() {
  return { characters: characters.data }
}

export async function getCharacterBySlug(slug) {
  const character = characters.data.find(item => item.slug === slug)
  if (!character) {
    throw new Error('Failed to fetch data')
  }

  const character_quotes = quotes.data.filter(item => item.character_id === character.id)
  return { character, character_quotes: character_quotes.length > 0 ? character_quotes : null }
}
