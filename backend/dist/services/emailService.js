"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInterviewReport = exports.sendInterviewInvitation = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});
const sendInterviewInvitation = async (candidateEmail, jobTitle, interviewDate, interviewLink) => {
    // Email sending is disabled in development
    console.log('sendInterviewInvitation called, but email sending is disabled.');
    return true;
};
exports.sendInterviewInvitation = sendInterviewInvitation;
const sendInterviewReport = async (recruiterEmail, candidateName, jobTitle, summary, screenshots, recordingUrl) => {
    // Email sending is disabled in development
    console.log('sendInterviewReport called, but email sending is disabled.');
    return true;
};
exports.sendInterviewReport = sendInterviewReport;
