CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('admin', 'creator', 'evaluator', 'participant');
CREATE TYPE survey_status AS ENUM ('draft', 'active', 'closed', 'archived');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'text', 'rating', 'yes_no', 'matrix');
CREATE TYPE send_method AS ENUM ('email', 'sms', 'whatsapp');
CREATE TYPE log_action AS ENUM (
  'user_login', 'user_logout', 'user_created', 'user_updated', 'user_deleted',
  'survey_created', 'survey_updated', 'survey_deleted', 'survey_sent', 'survey_completed',
  'response_submitted'
);
