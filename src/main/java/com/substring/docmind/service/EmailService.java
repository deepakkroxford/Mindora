package com.substring.docmind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    /**
     * Send a 6-digit OTP to the specified email address
     */
    public void sendOtpEmail(String toEmail, String otp) {
        log.info("Attempting to send OTP email to: {}", toEmail);
        
        // Output OTP to console regardless so the user is never blocked in dev mode
        System.out.println("\n==================================================");
        System.out.println("   [MINDORA PASSWORD RESET OTP]   ");
        System.out.println("   Email: " + toEmail);
        System.out.println("   OTP Code: " + otp);
        System.out.println("==================================================\n");

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Mindora - Password Reset OTP");
            message.setText("Dear User,\n\n"
                    + "You requested a password reset for your Mindora account. "
                    + "Please use the following 6-digit One-Time Password (OTP) to complete the reset process:\n\n"
                    + "OTP Code: " + otp + "\n\n"
                    + "This code is valid for 10 minutes. If you did not request this, please ignore this email.\n\n"
                    + "Best regards,\n"
                    + "The Mindora Team");
            
            mailSender.send(message);
            log.info("OTP email successfully sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}. Error: {}", toEmail, e.getMessage());
            log.warn("SMTP Mail Sender might not be configured. Please retrieve the OTP from the console log above.");
        }
    }
}
