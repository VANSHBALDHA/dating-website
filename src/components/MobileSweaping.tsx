"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Avatar,
  Button,
  FormControlLabel,
  Checkbox,
  Modal,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import InstructionModal from "@/components/InstructionModal";
import UserProfileModal from "@/components/UserProfileModal";
import { Flag } from "@mui/icons-material";
import Header from "@/components/Header";
import AboutSection from "@/components/AboutSection";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import Footer from "./Footer";
import { jwtDecode } from "jwt-decode";
import TinderCard from "react-tinder-card";

export interface DetailViewHandle {
  open: (id: string) => void;
}

export default function MobileSweaping() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [showEndPopup, setShowEndPopup] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const DAILY_LIMIT = 15;
  const [profileId, setProfileId] = useState<any>();
  const [showDetail, setShowDetail] = useState<any>(false);
  const [selectedUserId, setSelectedUserId] = useState<any>(null);
  const [idParam, setIdparam] = useState<any>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [membership, setMembership] = useState(0);
  const [id, setId] = useState("");
  const [memberalarm, setMemberAlarm] = useState("0");
  const [isProcessingSwipe, setIsProcessingSwipe] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    reportUser: false,
    blockUser: false,
  });
  const swipeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  const handleClose = () => {
    setShowDetail(false);
    setSelectedUserId(null);
  };

  const visibleProfiles = useMemo(() => {
    return userProfiles.slice(currentIndex, currentIndex + 2);
  }, [userProfiles, currentIndex]);

  const preloadProfiles = useMemo(() => {
    return userProfiles.slice(currentIndex + 2, currentIndex + 7);
  }, [userProfiles, currentIndex]);

  const currentProfile = useMemo(() => {
    return userProfiles[currentIndex];
  }, [userProfiles, currentIndex]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const queryParams = new URLSearchParams(window.location.search);
      var param = queryParams.get("q");

      setIdparam(param);
      const id = localStorage.getItem("logged_in_profile");
      if (id) {
        getUserList(id);
        fetchCurrentProfileInfo(param);
        setProfileId(id);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("loginInfo");
      const count = localStorage.getItem("memberalarm");
      setMemberAlarm(count ?? "0");

      if (token) {
        const decodeToken = jwtDecode<any>(token);
        setProfileId(decodeToken.profileId);
        setMembership(decodeToken.membership);
        fetchCurrentProfileInfo(decodeToken.profileId);
        getUserList(decodeToken.profileId);
      } else {
        router.push("/login");
      }
    }
  }, []);

  const fetchCurrentProfileInfo = useCallback(async (currentProfileId: any) => {
    if (currentProfileId) {
      try {
        const response = await fetch(
          `/api/user/sweeping/user?id=${currentProfileId}`
        );
        if (!response.ok) {
          console.error(
            "Failed to fetch advertiser data:",
            response.statusText
          );
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { user: advertiserData } = await response.json();
        if (!advertiserData) {
          console.error("Advertiser not found");
        } else {
          setSelectedUserProfile(advertiserData);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error.message);
      }
    }
  }, []);

  const getUserList = useCallback(async (profileId: string) => {
    try {
      const response = await fetch(
        "/api/user/sweeping/swipes?id=" + profileId,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      const profiles = data?.swipes || [];
      setUserProfiles(profiles);

      if (data?.totalRows !== undefined && data.totalRows <= 0) {
        setShowEndPopup(true);
      }

      preloadProfileImages(profiles);
    } catch (error) {
      console.error("Error fetching user profiles:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const preloadProfileImages = useCallback((profiles: any[]) => {
    if (!profiles || profiles.length === 0) return;

    const imageUrls = new Set<string>();

    profiles.forEach(profile => {
      if (profile?.Avatar) {
        imageUrls.add(profile.Avatar);
      }
    });

    imageUrls.forEach(url => {
      if (!preloadedImages.has(url)) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          setPreloadedImages(prev => {
            const updated = new Set(prev);
            updated.add(url);
            return updated;
          });
        };
      }
    });
  }, [preloadedImages]);

  const handleUpdateCategoryRelation = useCallback(
    async (category: any, targetProfile: any) => {
      try {
        setIdparam(null);
        const response = await fetch("/api/user/sweeping/relation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pid: profileId,
            targetid: targetProfile?.Id,
            newcategory: category,
          }),
        });

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error:", error);
        return null;
      }
    },
    [profileId]
  );

  const sendNotification = useCallback(
    async (message: any, targetProfile: any) => {
      const response = await fetch("/api/user/notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: targetProfile?.Id,
          body: message,
          image: "https://example.com/path/to/image.jpg",
          url: `https://swing-social-website.vercel.app/members/${profileId}`,
        }),
      });

      return await response.json();
    },
    [profileId]
  );

  const handleUpdateLikeMatch = useCallback(
    async (targetProfile: any) => {
      try {
        const response = await fetch("/api/user/sweeping/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profileid: profileId,
            targetid: targetProfile?.Id,
          }),
        });

        const username = localStorage.getItem("profileUsername");
        const data = await response.json();

        if (data?.isMatch) {
          setMatchedProfile(targetProfile);
          setShowMatchPopup(true);
          setId(targetProfile?.Id);
          sendNotification(
            `You have a new match with ${username}!`,
            targetProfile
          );
        }

        return data;
      } catch (error) {
        console.error("Error:", error);
        return null;
      }
    },
    [profileId, sendNotification]
  );

  const handleReportUser = useCallback(
    async (targetProfile: any) => {
      try {
        const response = await fetch("/api/user/sweeping/report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profileid: profileId,
            targetid: targetProfile?.Id,
          }),
        });

        return await response.json();
      } catch (error) {
        console.error("Error:", error);
        return null;
      }
    },
    [profileId]
  );

  const handleGrantAccess = useCallback(async () => {
    try {
      const response = await fetch("/api/user/sweeping/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileid: profileId,
          targetid: currentProfile?.Id,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }, [profileId, currentProfile]);

  const isUserPremium = () => membership === 1;
  const hasReachedSwipeLimit = () => swipeCount >= DAILY_LIMIT;

  // Handler for swipe
  const onSwipe = useCallback(
    async (direction: string, profile: any) => {
      if (isProcessingSwipe) return;
      if (!profile) return;
      if (idParam != null) {
        router.push("/members");
        return;
      }
      setIsProcessingSwipe(true);
      setLoading(true);
      const nextIndex = currentIndex + 1;
      try {
        if (direction === "left") {
          await handleUpdateCategoryRelation("Denied", profile);
        } else if (direction === "right") {
          await handleUpdateCategoryRelation("Liked", profile);
          await handleUpdateLikeMatch(profile);
        } else if (direction === "down") {
          await handleUpdateCategoryRelation("Maybe", profile);
        }

        setCurrentIndex(nextIndex);

        if (nextIndex >= userProfiles.length) {
          setShowEndPopup(true);
        }
        if (!isUserPremium() && hasReachedSwipeLimit()) {
          setShowLimitPopup(true);
        } else if (!isUserPremium()) {
          setSwipeCount((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Error processing swipe:", error);
      } finally {
        setIsProcessingSwipe(false);
        setLoading(false);
      }
    },
    [
      isProcessingSwipe,
      currentIndex,
      userProfiles.length,
      isUserPremium,
      hasReachedSwipeLimit,
      handleUpdateCategoryRelation,
      handleUpdateLikeMatch,
      idParam,
      router,
    ]
  );

  // Handler for swipe buttons
  const handleSwipeAction = useCallback(
    (action: string) => {
      const targetProfile = userProfiles[currentIndex];
      if (!targetProfile) return;
      let direction: "left" | "right" | "down";
      if (action === "like") direction = "right";
      else if (action === "delete") direction = "left";
      else direction = "down";
      onSwipe(direction, targetProfile);
    },
    [currentIndex, userProfiles, onSwipe]
  );

  const handleReportModalToggle = useCallback(() => {
    setIsReportModalOpen((prev) => !prev);
  }, []);

  const handleCheckboxChange = useCallback((event: any) => {
    const { name, checked } = event.target;
    setReportOptions((prev) => ({
      ...prev,
      [name]: checked,
    }));
  }, []);

  const handleReportSubmit = useCallback(() => {
    setIsReportModalOpen(false);
    if (currentProfile) {
      handleReportUser(currentProfile);
    }
  }, [handleReportUser, currentProfile]);

  const handleChatAction = () => {
    router.push(`/messaging/${id}`);
  };

  useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current) {
        clearTimeout(swipeTimeoutRef.current);
      }
    };
  }, []);

  const LoaderOverlay = () =>
    loading ? (
      <Box
        position="fixed"
        top={0}
        left={0}
        width="100vw"
        height="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor="rgba(0,0,0,0.7)"
        zIndex={9999}
      >
        <Box
          component="img"
          src="/loading.png"
          alt="Loading"
          sx={{ width: 60, height: 60 }}
        />
      </Box>
    ) : null;

  if (loading && userProfiles.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        bgcolor="#121212"
      >
        <Box
          component="img"
          src="/loading.png"
          alt="Logo"
          sx={{
            width: "50px",
            height: "auto",
            flexShrink: 0,
          }}
        />
        <span
          style={{ color: "#C2185B", paddingLeft: "10px", fontSize: "32px" }}
        >
          SWINGSOCIAL
        </span>
      </Box>
    );
  }

  if (userProfiles.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        bgcolor="#121212"
      >
        <Typography variant="h6" color="white">
          Please wait...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <style>{`
    .swipe-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      width: 100%;
      margin: 0 auto;
      background-color: #0a0a0a;
      position: relative;
      overflow: visible;
    }
    .swipe-button {
      position: absolute;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background-color: rgba(255, 27, 107, 0.1);
      display: none;
      justify-content: center;
      align-items: center;
      cursor: pointer;
    }
    @media screen and (min-width: 768px) {
      .swipe-button {
        display: flex;
      }
    }
    .swipe-button img {
      width: 50px;
      height: 50px;
    }
    .swipe-button.like {
      top: 47%;
      right: 0;
      transform: translateY(-50%);
    }
    .swipe-button.delete {
      top: 47%;
      left: 0;
      transform: translateY(-50%);
    }
    .swipe-button.maybe {
      top: 77%;
      left: 56%;
      transform: translateX(-50%);
      z-index: 999;
    }
    .profile-card {
     width: 100%;
     max-width: 400px;
     background-color: #121212;
     color: white;
     border: none;
     box-shadow: 0 8px 32px rgba(0,0,0,0.2);
     border-radius: 16px;
     overflow: hidden;
     margin: 0 auto;
  position: relative;
  z-index: 2;
  margin-top: 60px;
    }

    .avatar-wrapper {
      width: 100%;
      height: 450px;
      position: relative;
      pointer-events: none;
    }
    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
      
    .profile-info-icon {
      position: absolute;
      top: 100px;
      right: -10px;
      transform: translate(-50%, -50%);
      width: 40px;
      z-index: 10;
      cursor: pointer;
      pointer-events: auto;
    }

    .profile-info-icon img{
      width: 100%;
      height: 100%;
      object-fit: cover;
      }

    .flag-icon {
      position: absolute;
      bottom: 8px;
      right: 20px;
      background-color: rgba(0, 0, 0, 0.6);
      padding: 5px;
      border-radius: 5px;
      pointer-events: auto;
      cursor: pointer;
    }
    .card-content {
      padding: 16px;
    }
    .card-content h3 {
      margin: 0 0 10px;
    }
    .card-content .location {
      color: #C2185B;
      font-size: 1rem;
      font-weight: bold;
    }
    .swipe-overlay {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;
      border-radius: 4px;
      padding: 10px;
    }
    .swipe-overlay img {
      width: 150px;
      height: 150px;
    }
  `}</style>

      <Header />
      <ToastContainer position="top-right" autoClose={3000} />

      <LoaderOverlay />

      <div style={{ display: 'none' }}>
        {preloadProfiles.map((profile, index) =>
          profile?.Avatar ? (
            <img
              key={`preload-${index}`}
              src={profile.Avatar}
              alt="preload"
              onLoad={() => {
                setPreloadedImages(prev => {
                  const updated = new Set(prev);
                  updated.add(profile.Avatar);
                  return updated;
                });
              }}
            />
          ) : null
        )}
      </div>

      <div className="swipe-container">
        {/* Like Button */}
        <div className="swipe-button like" onClick={() => handleSwipeAction("like")}>
          <img src="/like.png" alt="Like" />
        </div>
        {/* Delete Button */}
        <div className="swipe-button delete" onClick={() => handleSwipeAction("delete")}>
          <img src="/delete.png" alt="Delete" />
        </div>
        {/* Maybe Button */}
        <div className="swipe-button maybe" onClick={() => handleSwipeAction("maybe")}>
          <img src="/maybe.png" alt="Maybe" />
        </div>

        {/* Card Rendering */}
        {idParam !== null ? (
          <div style={{ position: "relative" }}>
            <div className="profile-card">
              <div className="avatar-wrapper">
                <img
                  className="avatar-img"
                  src={selectedUserProfile?.Avatar || ""}
                  alt={selectedUserProfile?.Username || "Unknown"}
                />

                <div className="flag-icon" onClick={e => {
                  e.stopPropagation();
                  handleReportModalToggle();
                }}>
                  <Flag sx={{ color: "#9c27b0" }} />
                </div>
              </div>
              <div className="card-content">
                <h3>
                  {selectedUserProfile?.Username || "Unknown"},{" "}
                  {selectedUserProfile?.DateOfBirth &&
                    new Date().getFullYear() - new Date(selectedUserProfile.DateOfBirth).getFullYear()}
                  {selectedUserProfile?.Gender === "Male" ? "M" : selectedUserProfile?.Gender === "Female" ? "F" : ""}
                  {selectedUserProfile?.PartnerDateOfBirth && (
                    <>
                      {" | "}
                      {new Date().getFullYear() -
                        new Date(selectedUserProfile.PartnerDateOfBirth).getFullYear()}
                      {selectedUserProfile?.PartnerGender === "Male"
                        ? "M"
                        : selectedUserProfile?.PartnerGender === "Female"
                          ? "F"
                          : ""}
                    </>
                  )}
                </h3>
                <span className="location">
                  {selectedUserProfile?.Location?.replace(", USA", "")}
                </span>
                <AboutSection aboutText={selectedUserProfile?.About} />
              </div>
            </div>
            <div className="profile-info-icon" onClick={() => {
              setShowDetail(true);
              setSelectedUserId(userProfiles[currentIndex]?.Id);
            }}>
              <img src="/ProfileInfo.png" alt="Profile Info" />
            </div>
          </div>
        ) : (
          userProfiles[currentIndex] && (
            <>
              <div style={{ position: "relative" }}>
                <TinderCard
                  key={userProfiles[currentIndex].Id}
                  onSwipe={(dir) => onSwipe(dir, userProfiles[currentIndex])}
                  preventSwipe={["up"]}
                  className="profile-card"
                  flickOnSwipe
                >
                  <div className="avatar-wrapper">
                    <img
                      className="avatar-img"
                      src={userProfiles[currentIndex]?.Avatar || ""}
                      alt={userProfiles[currentIndex]?.Username || "Unknown"}
                    />

                    <div className="flag-icon" onClick={e => {
                      e.stopPropagation();
                      handleReportModalToggle();
                    }}>
                      <Flag sx={{ color: "#9c27b0" }} />
                    </div>
                  </div>
                  <div className="card-content">
                    <h3>
                      {userProfiles[currentIndex]?.Username || "Unknown"},{" "}
                      {userProfiles[currentIndex]?.DateOfBirth &&
                        new Date().getFullYear() - new Date(userProfiles[currentIndex].DateOfBirth).getFullYear()}
                      {userProfiles[currentIndex]?.Gender === "Male" ? "M" : userProfiles[currentIndex]?.Gender === "Female" ? "F" : ""}
                      {userProfiles[currentIndex]?.PartnerDateOfBirth && (
                        <>
                          {" | "}
                          {new Date().getFullYear() - new Date(userProfiles[currentIndex].PartnerDateOfBirth).getFullYear()}{" "}
                          {userProfiles[currentIndex]?.PartnerGender === "Male"
                            ? "M"
                            : userProfiles[currentIndex]?.PartnerGender === "Female"
                              ? "F"
                              : ""}
                        </>
                      )}
                    </h3>
                    <span className="location">
                      {userProfiles[currentIndex]?.Location?.replace(", USA", "")}
                    </span>
                  </div>
                  <div>
                    <AboutSection aboutText={userProfiles[currentIndex]?.About} />
                  </div>
                </TinderCard>
                <div className="profile-info-icon" onClick={() => {
                  setShowDetail(true);
                  setSelectedUserId(userProfiles[currentIndex]?.Id);
                }}>
                  <img src="/ProfileInfo.png" alt="Profile Info" />
                </div>
              </div>
            </>
          )
        )}
      </div>

      {/* Below code only for model */}
      {memberalarm && parseInt(memberalarm) > 2 ? null : <InstructionModal />}
      <UserProfileModal
        handleGrantAccess={handleGrantAccess}
        handleClose={handleClose}
        open={showDetail}
        userid={selectedUserId}
      />

      <Modal open={isReportModalOpen} onClose={handleReportModalToggle}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 300,
            bgcolor: "#1e1e1e",
            color: "white",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Report or Block User
          </Typography>
          <FormControlLabel
            sx={{
              color: "white",
              "& .MuiCheckbox-root": {
                color: "#9c27b0",
              },
              "& .MuiCheckbox-root.Mui-checked": {
                color: "#9c27b0",
              },
            }}
            control={
              <Checkbox
                checked={reportOptions.reportUser}
                onChange={handleCheckboxChange}
                name="reportUser"
              />
            }
            label="Report User"
          />
          <FormControlLabel
            sx={{
              color: "white",
              "& .MuiCheckbox-root": {
                color: "#9c27b0",
              },
              "& .MuiCheckbox-root.Mui-checked": {
                color: "#9c27b0",
              },
            }}
            control={
              <Checkbox
                checked={reportOptions.blockUser}
                onChange={handleCheckboxChange}
                name="blockUser"
              />
            }
            label="Block User"
          />
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button
              onClick={handleReportSubmit}
              variant="contained"
              color="secondary"
            >
              Submit
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Popup #1: Daily Limit */}
      <Dialog
        open={showLimitPopup}
        onClose={() => setShowLimitPopup(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#121212",
            color: "#ffffff",
          },
        }}
      >
        <DialogTitle sx={{ color: "#e91e63" }}>Daily Limit Reached</DialogTitle>
        <DialogContent>
          <Typography>
            You've reached your daily limit of {DAILY_LIMIT} swipes. Upgrade
            your membership to swipe more!
          </Typography>
          <Button
            onClick={() => router.push(`/membership`)}
            sx={{
              mt: 2,
              backgroundColor: "#e91e63",
              color: "white",
              "&:hover": {
                backgroundColor: "#d81b60",
              },
            }}
          >
            Upgrade
          </Button>
          <Button
            onClick={() => setShowLimitPopup(false)}
            sx={{
              mt: 2,
              marginLeft: 1,
              color: "white",
              "&:hover": {
                backgroundColor: "#d81b60",
              },
            }}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>

      {/* Popup #2: Match Found */}
      <Dialog
        open={showMatchPopup}
        onClose={() => setShowMatchPopup(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#121212",
            color: "#ffffff",
          },
        }}
      >
        <DialogTitle sx={{ color: "#03dac5" }}>It's a Match!</DialogTitle>
        <DialogContent>
          {matchedProfile && (
            <Box textAlign="center">
              <Avatar
                src={matchedProfile.Avatar}
                alt={matchedProfile.Username}
                sx={{
                  width: 100,
                  height: 100,
                  margin: "auto",
                  border: "2px solid #03dac5",
                }}
              />
              <Typography
                sx={{ mt: 2 }}
              >{`You've matched with ${matchedProfile.Username}!`}</Typography>
              <Box display="flex" justifyContent="center" gap={2} mt={2}>
                <Button
                  onClick={() => {
                    setShowDetail(true);
                    setSelectedUserId(matchedProfile?.Id);
                  }}
                  variant="contained"
                  sx={{
                    backgroundColor: "#03dac5",
                    color: "#121212",
                    "&:hover": {
                      backgroundColor: "#00c4a7",
                    },
                  }}
                >
                  View Profile
                </Button>
                <Button
                  onClick={handleChatAction}
                  variant="contained"
                  sx={{
                    backgroundColor: "#03dac5",
                    color: "#121212",
                    "&:hover": {
                      backgroundColor: "#00c4a7",
                    },
                  }}
                >
                  Chat
                </Button>
                <Button
                  onClick={() => setShowMatchPopup(false)}
                  variant="outlined"
                  sx={{
                    color: "#03dac5",
                    borderColor: "#03dac5",
                    "&:hover": {
                      borderColor: "#00c4a7",
                      color: "#00c4a7",
                    },
                  }}
                >
                  Continue Swiping
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Popup #3: End of Records */}
      <Dialog
        open={showEndPopup}
        onClose={() => setShowEndPopup(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#121212",
            color: "#ffffff",
          },
        }}
      >
        <DialogTitle sx={{ color: "white" }}>End of Records</DialogTitle>
        <DialogContent>
          <Typography>
            You've run out of matches. Adjust your preferences to view more
            members.
          </Typography>
          <Button
            onClick={() => router.push("/prefrences")}
            variant="outlined"
            sx={{
              mt: 2,
              color: "white",
              borderColor: "#e91e63",
              "&:hover": {
                borderColor: "#e64a19",
                color: "#e64a19",
              },
            }}
          >
            Update Preferences
          </Button>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}