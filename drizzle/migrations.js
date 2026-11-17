import journal from './meta/_journal.json';
import m0000 from './0000_init.sql';
import m0001 from './0001_exercise_log_dosage.sql';
import m0002 from './0002_reset_pre_onboarding_data.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  