/**
 * Starter road-safety quiz content for the Philippine ROAD RUSH prototype.
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
  { id:'yellow-light',level:'beginner',topic:'Traffic signals',prompt:'What does a steady yellow traffic light mean?',choices:['Speed up immediately','Prepare to stop if it is safe','The road is closed'],answer:1,explanation:'A yellow light warns that the signal is changing; stop when it is safe to do so.' },
  { id:'seatbelt',level:'beginner',topic:'Occupant safety',prompt:'When should a driver wear a seat belt?',choices:['Only on highways','Before and during every trip','Only at night'],answer:1,explanation:'Seat belts reduce injury risk and are required under applicable Philippine seat-belt rules.' },
  { id:'blindspot',level:'intermediate',topic:'Lane changes',prompt:'Before changing lanes, what should you do?',choices:['Check mirrors and blind spots and signal','Honk and move instantly','Rely only on the rearview mirror'],answer:0,explanation:'Signal and check surrounding traffic, including blind spots, before changing lanes.' },
  { id:'wet-road',level:'intermediate',topic:'Defensive driving',prompt:'How should you adjust your driving on a wet road?',choices:['Follow the car ahead closely','Increase following distance and slow down','Brake suddenly at every corner'],answer:1,explanation:'Wet surfaces reduce traction and increase stopping distance.' },
  { id:'intersection',level:'intermediate',topic:'Right-of-way',prompt:'At an uncontrolled intersection, what is the safest approach?',choices:['Assume other drivers will stop','Slow down, scan for hazards, and yield as required','Accelerate to enter first'],answer:1,explanation:'Approach cautiously and apply right-of-way rules rather than assuming priority.' },
  { id:'hydroplane',level:'pro',topic:'Hazard response',prompt:'Your vehicle begins hydroplaning in heavy rain. What is the safest initial response?',choices:['Brake hard immediately','Ease off the accelerator and steer gently','Turn sharply toward the shoulder'],answer:1,explanation:'Avoid sudden braking or steering while tires regain traction.' },
  { id:'brake-failure',level:'pro',topic:'Emergency response',prompt:'Your brakes become ineffective while moving. What should you do first?',choices:['Switch off the engine and lock the steering','Stay calm, release the accelerator and try controlled braking or downshifting','Jump out of the vehicle'],answer:1,explanation:'Maintain steering control, reduce speed gradually and seek a safe stopping area.' },
  { id:'collision',level:'pro',topic:'Accident response',prompt:'After a collision with injuries, what is the priority?',choices:['Leave immediately','Secure the scene, call emergency services, and assist without creating further danger','Move all injured people regardless of risk'],answer:1,explanation:'Protect people at the scene and seek emergency assistance; avoid unnecessary movement of injured persons.' },
]);
export function chooseQuestion(previousId = null, random = Math.random, level = 'beginner') {
  const candidates = QUESTIONS.filter(q => (q.level || 'beginner') === level);
  const pool = candidates.filter(q => q.id !== previousId);
  if (!pool.length) return candidates[0] || QUESTIONS[0];
  return pool[Math.floor(random() * pool.length)];
}
export function evaluateAnswer(question, selectedIndex) {
  return { correct: selectedIndex === question.answer, explanation: question.explanation };
}
