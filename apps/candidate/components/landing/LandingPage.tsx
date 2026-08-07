"use client";

import Navbar from "./Navbar";
import Hero from "./Hero";
import SuccessMirror from "./SuccessMirror";
import PartnerSection from "./PartnerSection";
import EmpowerSection from "./EmpowerSection";
import RoadmapFeatures from "./RoadmapFeatures";
import GuidingPrinciples from "./GuidingPrinciples";
import ProcessRoadmap from "./ProcessRoadmap";
import RobotVisual from "./RobotVisual";
import ShapeModelSection from "./ShapeModelSection";
import TestimonialsSection from "./TestimonialsSection";
import Footer from "./Footer";
import ContactModal from "./ContactModal";
import { useLandingEffects } from "./useLandingEffects";

export default function LandingPage() {
  useLandingEffects();

  return (
    <div className="wrapper">
      <Navbar />
      <Hero />
      <SuccessMirror />
      <PartnerSection />
      <EmpowerSection />
      <RoadmapFeatures />
      <GuidingPrinciples />
      <ProcessRoadmap />
      <RobotVisual />
      <ShapeModelSection />
      <TestimonialsSection />
      <Footer />
      <ContactModal />
    </div>
  );
}
