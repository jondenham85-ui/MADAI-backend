const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

const COOKIE_NAME = "madai_session";

function requireJwtSecret() {
  if (!process.env.JWT_SECRET) {
    const error = new Error("JWT_SECRET is not configured");
    error.status = 500;
    throw error;
  }

  return process.env.JWT_SECRET;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
  };
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    },
    requireJwtSecret(),
    {
      expiresIn: "7d",
    }
  );
}

function cookieOptions() {
  const production = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

async function currentUser(req) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, requireJwtSecret());

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

router.get("/me", async (req, res, next) => {
  try {
    const user = await currentUser(req);

    if (!user) {
      return res.status(401).json({
        error: "Not authenticated",
      });
    }

    return res.json({
      user: publicUser(user),
      plan: {
        key: "free",
        label: "Free",
        limits: {
          tasksPerMonth: 25,
          buildsPerMonth: 3,
          chatPerDay: 10,
          projects: 2,
        },
      },
      usage: {
        tasksThisMonth: 0,
        buildsThisMonth: 0,
        chatToday: 0,
      },
      madPackCredits: {
        tasks: 0,
        builds: 0,
      },
      subscription: {
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
      monthlyResetsAt: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      ).toISOString(),
      org: null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/signup", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email, and password are required",
      });
    }

    if (password.length < 10) {
      return res.status(400).json({
        error: "Password must contain at least 10 characters",
      });
    }

    if (
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return res.status(400).json({
        error:
          "Password must include upper case, lower case, and a number",
      });
    }

    const existing = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: "An account already exists for that email",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    const token = createToken(user);
    res.cookie(COOKIE_NAME, token, cookieOptions());

    return res.status(201).json({
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = createToken(user);
    res.cookie(COOKIE_NAME, token, cookieOptions());

    return res.json({
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res) => {
  clearSession(res);

  res.json({
    success: true,
  });
});

router.post("/logout-all", async (req, res, next) => {
  try {
    const user = await currentUser(req);

    if (user) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          tokenVersion: {
            increment: 1,
          },
        },
      });
    }

    clearSession(res);

    return res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", (req, res) => {
  res.json({
    success: true,
    message: "If that account exists, a reset link will be sent.",
  });
});

router.post("/reset-password", (req, res) => {
  res.status(501).json({
    error: "Password reset email delivery is not configured yet",
  });
});

router.post("/verify-email", (req, res) => {
  res.status(501).json({
    error: "Email verification is not configured yet",
  });
});

router.post("/resend-verification", (req, res) => {
  res.status(501).json({
    error: "Email verification is not configured yet",
  });
});

module.exports = router;
