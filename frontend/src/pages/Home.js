import { useRef } from "react";
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import '../styles/home.css';
import { MdMenuBook } from 'react-icons/md';
import { FaChalkboardTeacher, FaVideo } from 'react-icons/fa';
import { IoSearchOutline } from 'react-icons/io5';
import Footer from '../components/Footer';

import hero1 from '../assets/HeroBanner.jpg';
import hero2 from '../assets/HeroBanner2.jpg';
import hero3 from '../assets/HeroBanner3.jpg';

// ─── Hero slides ──────────────────────────────────────────────────────────────
const heroImages = [
  {
    image: hero1,
    title: (<>Transform Your Future with <span className="highlight">Elite Online Tutors</span></>),
    description: "Unlock unlimited potential with personalized learning experiences.",
    buttonText: "Start Your Journey",
  },
  {
    image: hero2,
    title: (<>Learn <span className="highlight">Anywhere, Anytime</span></>),
    description: "Break free from classroom boundaries.",
    buttonText: "Explore Classes",
  },
  {
    image: hero3,
    title: (<>World-Class <span className="highlight">Expert Tutors</span></>),
    description: "Connect with certified educators who inspire excellence.",
    buttonText: "Meet Our Tutors",
  },
];

// ─── Main Home component ──────────────────────────────────────────────────────
const Home = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");

  const featuresRef = useRef(null);
  const classesRef  = useRef(null);
  const tutorsRef   = useRef(null);

  const [currentIndex, setCurrentIndex]       = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [teachers, setTeachers]               = useState([]);

  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  const scrollToClasses  = () => classesRef.current?.scrollIntoView({ behavior: "smooth" });

  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => (prev === 0 ? heroImages.length - 1 : prev - 1));
  }, [isTransitioning]);

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => (prev === heroImages.length - 1 ? 0 : prev + 1));
  }, [isTransitioning]);

  useEffect(() => {
    if (!isSearchFocused) {
      const timer = setInterval(() => { handleNext(); }, 6000);
      return () => clearInterval(timer);
    }
  }, [handleNext, isSearchFocused]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/teachers`)
      .then(res => res.json())
      .then(data => {
        if (data.teachers) setTeachers(data.teachers.filter(t => t.isApproved));
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsTransitioning(false), 600);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const handleSearch = () => {
    if (searchText.trim() !== "") navigate(`/subjects/${searchText}`);
  };

  return (
    <div className="home-container">

      {/* Hero */}
      <section className="hero-carousel">
        <div className="carousel-wrapper">
          {heroImages.map((item, index) => (
            <div
              key={index}
              className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
              style={{ backgroundImage: `url(${item.image})` }}
            >
              <div className="slide-overlay"></div>
              <div className="carousel-content">
                <h1 className="slide-title">{item.title}</h1>
                <p className="slide-description">{item.description}</p>
                <button
                  className="cta-button"
                  onClick={() => {
                    if (item.buttonText === "Start Your Journey") scrollToFeatures();
                    else if (item.buttonText === "Explore Classes") scrollToClasses();
                    else tutorsRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {item.buttonText}
                </button>
                <div className="search-box">
                  <IoSearchOutline className="search-icon" />
                  <input
                    type="text"
                    placeholder="Discover your perfect subject..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                  <button className="search-button" onClick={handleSearch}>Find Courses</button>
                </div>
                <div className="category-tags">
                  {['Tamil', 'English', 'Maths', 'Science', 'Social'].map((subject) => (
                    <span key={subject} className="subject-tag" onClick={() => navigate(`/subjects/${subject}`)}>
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <button className="arrow left" onClick={handlePrev}><span>&#10094;</span></button>
          <button className="arrow right" onClick={handleNext}><span>&#10095;</span></button>
          <div className="carousel-dots">
            {heroImages.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="about-section">
        <div className="section-container">
          <div className="section-header">
            <h2>Revolutionizing Education, One Student at a Time</h2>
          </div>
          <div className="about-content">
            <p>Join a community of passionate educators and ambitious learners.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" ref={featuresRef}>
        <div className="section-container">
          <div className="section-header"><h2>What Makes Us Amazing?</h2></div>
          <div className="card-grid">
            <div className="feature-card"><MdMenuBook /> <h3>Complete Subject Universe</h3></div>
            <div className="feature-card"><FaVideo />    <h3>Live + Recorded Learning</h3></div>
            <div className="feature-card"><FaChalkboardTeacher /> <h3>Instant Tutor Connect</h3></div>
          </div>
        </div>
      </section>

      {/* Classes */}
      <section className="classes-section" ref={classesRef}>
        <div className="section-container">
          <div className="section-header"><h2>Explore Our Classes</h2></div>
          <div className="card-grid">
            <div className="class-card"><h3>Weekday Classes</h3>Weekday classes are scheduled throughout Monday to Friday during working hours</div>
            <div className="class-card"><h3>Weekend Classes</h3>Weekend classes are arranged exclusively on Saturdays and Sundays</div>
          </div>
        </div>
      </section>

      {/* Tutors */}
      <section className="tutors-section" ref={tutorsRef}>
        <div className="section-container">
          <div className="section-header"><h2>Meet Our Tutors</h2></div>
          {teachers.length === 0 ? (
            <p>No tutors available</p>
          ) : (
            <div className="card-grid">
              {teachers.map((teacher) => (
                <div key={teacher._id} className="teacher-card">
                  <h3>{teacher.firstName} {teacher.lastName}</h3>
                  <p><strong>Email:</strong> {teacher.email}</p>
                  <p><strong>Mobile:</strong> {teacher.mobile}</p>
                  <p><strong>Subject:</strong> {teacher.preferredSubject}</p>
                  <p><strong>Qualification:</strong> {teacher.qualification}</p>
                  {teacher.degreeCertificate && (
                    <a href={teacher.degreeCertificate} target="_blank" rel="noreferrer">View Certificate</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;