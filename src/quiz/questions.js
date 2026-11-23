/**
 * Starter road-safety quiz content for the Philippine LTO Road Rush prototype.
 * These are general safety concepts, NOT an official LTO examination question bank.
 * Verify wording against current official LTO publications before educational release.
 */
export const QUESTIONS = Object.freeze([
  { id: 'sign-stop', topic: 'Road signs', prompt: 'What should a driver do at a STOP sign?', choices: ['Stop completely and proceed only when safe', 'Speed up to clear the road', 'Ignore it when no car is visible'], answer: 0, explanation: 'A STOP sign requires a complete stop. Check for pedestrians and traffic before proceeding.' },
  { id: 'pedestrians', topic: 'Pedestrian safety', prompt: 'A pedestrian is crossing at a marked crossing. What should you do?', choices: ['Sound the horn and continue', 'Yield and let the pedestrian cross safely', 'Accelerate before they reach your lane'], answer: 1, explanation: 'Give way to pedestrians using a crossing and avoid putting them at risk.' },
  { id: 'helmet', topic: 'Motorcycle safety', prompt: 'Which choice best protects a motorcycle rider?', choices: ['Wear a properly fitted standard protective helmet', 'Wear headphones instead of a helmet', 'Skip the helmet for short trips'], answer: 0, explanation: 'Use an appropriate protective motorcycle helmet and fasten it correctly.' },
  { id: 'phone', topic: 'Distracted driving', prompt: 'What is the safest response to a message while driving?', choices: ['Read it while moving slowly', 'Type a quick reply', 'Pull over safely before using the phone'], answer: 2, explanation: 'Avoid distracted driving. Stop in a safe, permitted place before interacting with a phone.' },
  { id: 'signal', topic: 'Safe turns', prompt: 'Before turning, what should a driver do?', choices: ['Signal early and check mirrors and blind spots', 'Turn suddenly to save time', 'Assume other drivers will brake'], answer: 0, explanation: 'Communicate your intention and check that the turn can be made safely.' },
  { id: 'emergency', topic: 'Emergency vehicles', prompt: 'An emergency vehicle approaches with active siren and lights. What should you do?', choices: ['Race ahead of it', 'Give way safely and follow traffic directions', 'Block the lane to make it slow down'], answer: 1, explanation: 'Make room safely for responding emergency vehicles while observing road conditions.' },
]);
export function chooseQuestion(previousId = null, random = Math.random) {
  const pool = QUESTIONS.filter(q => q.id !== previousId);
  return pool[Math.floor(random() * pool.length)];
}
export function evaluateAnswer(question, selectedIndex) {
  return { correct: selectedIndex === question.answer, explanation: question.explanation };
}
