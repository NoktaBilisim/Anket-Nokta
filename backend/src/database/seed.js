const bcrypt = require('bcryptjs');
const { User, Survey, Question } = require('../models');
const logger = require('../utils/logger');

async function seedDatabase() {
  try {
    const count = await User.count();
    if (count > 0) return;

    logger.info('Seeding database...');

    const password = await bcrypt.hash('Admin123!', 12);
    const adminUser = await User.create({ name: 'Admin User', email: 'admin@surveypro.com', password, role: 'admin' });

    const creatorPass = await bcrypt.hash('Creator123!', 12);
    const creatorUser = await User.create({ name: 'Creator User', email: 'creator@surveypro.com', password: creatorPass, role: 'creator' });

    const evalPass = await bcrypt.hash('Eval123!', 12);
    await User.create({ name: 'Evaluator User', email: 'evaluator@surveypro.com', password: evalPass, role: 'evaluator' });

    const userPass = await bcrypt.hash('User123!', 12);
    await User.create({ name: 'Test User 1', email: 'user1@surveypro.com', password: userPass, role: 'participant', phone: '+905551234567' });
    await User.create({ name: 'Test User 2', email: 'user2@surveypro.com', password: userPass, role: 'participant', phone: '+905557654321' });

    // Sample survey
    const survey = await Survey.create({
      title: 'Çalışan Memnuniyeti Anketi',
      description: 'Yıllık çalışan memnuniyeti değerlendirmesi',
      status: 'active',
      created_by: adminUser.id
    });

    await Question.bulkCreate([
      { survey_id: survey.id, type: 'multiple_choice', text: 'Genel iş memnuniyetinizi değerlendirin', options: ['Çok Memnunum', 'Memnunum', 'Nötr', 'Memnun Değilim'], order: 0 },
      { survey_id: survey.id, type: 'rating', text: 'Yöneticinizle ilişkinizi 1-10 arası puanlayın', order: 1 },
      { survey_id: survey.id, type: 'text', text: 'İş ortamını geliştirmek için önerileriniz nelerdir?', order: 2 },
      { survey_id: survey.id, type: 'yes_no', text: 'Bu şirkette 2 yıl daha çalışmayı düşünür müsünüz?', order: 3 }
    ]);

    logger.info('Database seeded successfully');
  } catch (err) {
    logger.error('Seed error:', err.message);
  }
}

module.exports = { seedDatabase };
