import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendInterviewInvitation = async (
  candidateEmail: string,
  jobTitle: string,
  interviewDate: Date,
  interviewLink: string
) => {
  // Email sending is disabled in development
  console.log('sendInterviewInvitation called, but email sending is disabled.');
  return true;
};

export const sendInterviewReport = async (
  recruiterEmail: string,
  candidateName: string,
  jobTitle: string,
  summary: string,
  screenshots: string[],
  recordingUrl?: string
) => {
  // Email sending is disabled in development
  console.log('sendInterviewReport called, but email sending is disabled.');
  return true;
};
