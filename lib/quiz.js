import questions from '@/data/quiz.json'

export async function getQuizQuestion(id) {
  const question = questions.data.find(item => item.id === id)
  if (!question) {
    throw new Error('Failed to fetch data')
  }

  const { correct_answer, ...rest } = question
  return { question: rest }
}

export async function getRandomQuizQuestion() {
  const random = Math.floor(Math.random() * questions.data.length)
  return { randomQuestion: questions.data[random].id }
}
