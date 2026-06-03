import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const log = (msg: string) => console.log(msg);

// ─── Helper: tạo user nếu chưa có ────────────────────────────────────────────

async function upsertUser(data: {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  role: string;
  profile: object;
}) {
  const existing = await prisma.user.findFirst({ where: { email: data.email } });
  if (existing) {
    log(`  ⚠️  User already exists: ${data.email}`);
    return existing;
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const created = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      displayName: data.displayName,
      phone: data.phone,
      role: data.role,
      status: "active",
      ...data.profile,
    },
  });
  log(`  ✅ Created [${data.role}] ${data.email} / ${data.password}`);
  return created;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("\n🌱  Seeding NiChan database...\n");

  // ── STEP 1: Users (phải tạo trước để blog posts có thể reference) ────────

  log("👤 Users");
  const admin = await upsertUser({
    email: "admin@nichan.vn",
    password: "Admin@2026",
    displayName: "Super Admin",
    role: "admin",
    profile: { adminProfile: { create: { fullName: "Super Admin" } } },
  });

  await upsertUser({
    email: "organizer@nichan.vn",
    password: "Organizer@2026",
    displayName: "Nguyễn Văn Tổ Chức",
    role: "organizer",
    profile: {
      organizerProfile: {
        create: { fullName: "Nguyễn Văn Tổ Chức", jobTitle: "Senior Event Organizer" },
      },
    },
  });

  await upsertUser({
    email: "organizer2@nichan.vn",
    password: "Organizer@2026",
    displayName: "Trần Thị Vân Anh",
    role: "organizer",
    profile: {
      organizerProfile: {
        create: { fullName: "Trần Thị Vân Anh", jobTitle: "Wedding Specialist" },
      },
    },
  });

  await upsertUser({
    email: "customer@nichan.vn",
    password: "Customer@2026",
    displayName: "Trần Thị Khách Hàng",
    phone: "0901234567",
    role: "customer",
    profile: { customerProfile: { create: { fullName: "Trần Thị Khách Hàng" } } },
  });

  log("");

  // ── STEP 2: Service Categories ────────────────────────────────────────────

  log("📂 Service Categories");

  // Clean up old categories whose slugs have changed
  const oldSlugs = ["hoi-nghi", "khai-truong"];
  for (const slug of oldSlugs) {
    const old = await prisma.serviceCategory.findUnique({ where: { slug } });
    if (old) {
      await prisma.service.deleteMany({ where: { categoryId: old.id } });
      await prisma.serviceCategory.delete({ where: { slug } });
      log(`  🗑️  Removed old category: ${slug}`);
    }
  }

  const [catWedding, , catAnniversary, catConference, catGroundbreaking, catOpening, catInauguration, catGala, catYearEnd] = await Promise.all([
    prisma.serviceCategory.upsert({
      where: { slug: "tiec-cuoi" },
      update: { name: "Tiệc Cưới", description: "Tổ chức tiệc cưới sang trọng, chuyên nghiệp" },
      create: {
        name: "Tiệc Cưới",
        slug: "tiec-cuoi",
        description: "Tổ chức tiệc cưới sang trọng, chuyên nghiệp",
        sortOrder: 1,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "sinh-nhat" },
      update: { name: "Sinh Nhật", description: "Tiệc sinh nhật từ trang trí đến catering" },
      create: {
        name: "Sinh Nhật",
        slug: "sinh-nhat",
        description: "Tiệc sinh nhật từ trang trí đến catering",
        sortOrder: 2,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "ky-niem" },
      update: { name: "Kỷ Niệm", description: "Tổ chức tiệc kỷ niệm, lễ kỷ niệm thành lập" },
      create: {
        name: "Kỷ Niệm",
        slug: "ky-niem",
        description: "Tổ chức tiệc kỷ niệm, lễ kỷ niệm thành lập",
        sortOrder: 3,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "hoi-nghi-hoi-thao" },
      update: { name: "Hội Nghị & Hội Thảo", description: "Tổ chức hội nghị, hội thảo chuyên nghiệp" },
      create: {
        name: "Hội Nghị & Hội Thảo",
        slug: "hoi-nghi-hoi-thao",
        description: "Tổ chức hội nghị, hội thảo chuyên nghiệp",
        sortOrder: 4,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "le-dong-tho-khoi-cong" },
      update: { name: "Lễ Động Thổ & Khởi Công", description: "Tổ chức lễ động thổ, lễ khởi công dự án" },
      create: {
        name: "Lễ Động Thổ & Khởi Công",
        slug: "le-dong-tho-khoi-cong",
        description: "Tổ chức lễ động thổ, lễ khởi công dự án",
        sortOrder: 5,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "le-khai-truong" },
      update: { name: "Lễ Khai Trương", description: "Tổ chức lễ khai trương cửa hàng, showroom, chi nhánh" },
      create: {
        name: "Lễ Khai Trương",
        slug: "le-khai-truong",
        description: "Tổ chức lễ khai trương cửa hàng, showroom, chi nhánh",
        sortOrder: 6,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "le-khanh-thanh" },
      update: { name: "Lễ Khánh Thành", description: "Tổ chức lễ khánh thành công trình, dự án" },
      create: {
        name: "Lễ Khánh Thành",
        slug: "le-khanh-thanh",
        description: "Tổ chức lễ khánh thành công trình, dự án",
        sortOrder: 7,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "gala-dinner" },
      update: { name: "Gala Dinner", description: "Tổ chức tiệc Gala Dinner sang trọng, đẳng cấp" },
      create: {
        name: "Gala Dinner",
        slug: "gala-dinner",
        description: "Tổ chức tiệc Gala Dinner sang trọng, đẳng cấp",
        sortOrder: 8,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: "year-end-party" },
      update: { name: "Year End Party", description: "Tổ chức tiệc tất niên, Year End Party cho doanh nghiệp" },
      create: {
        name: "Year End Party",
        slug: "year-end-party",
        description: "Tổ chức tiệc tất niên, Year End Party cho doanh nghiệp",
        sortOrder: 9,
      },
    }),
  ]);
  log("  ✅ 9 categories ready\n");

  // ── STEP 3: Services ──────────────────────────────────────────────────────

  log("🎯 Services");
  const servicesData = [
    {
      slug: "tiec-cuoi-tron-goi",
      categoryId: catWedding.id,
      title: "Tiệc Cưới Trọn Gói",
      shortDescription: "Gói dịch vụ tiệc cưới hoàn chỉnh từ A-Z",
      description: "Bao gồm trang trí, âm thanh, ánh sáng, catering và MC chuyên nghiệp. Phù hợp 100–500 khách.",
      priceFrom: "50000000",
      priceTo: "300000000",
      guestFrom: 100,
      guestTo: 500,
      isFeatured: true,
    },
    {
      slug: "tiec-cuoi-nho-gon",
      categoryId: catWedding.id,
      title: "Tiệc Cưới Nhỏ Gọn",
      shortDescription: "Gói tiệc cưới ấm cúng cho gia đình nhỏ",
      description: "Phù hợp cho đám cưới thân mật 30–80 khách. Trang trí tinh tế, ấm áp.",
      priceFrom: "15000000",
      priceTo: "60000000",
      guestFrom: 30,
      guestTo: 80,
      isFeatured: false,
    },
    {
      slug: "hoi-nghi-doanh-nghiep",
      categoryId: catConference.id,
      title: "Hội Nghị Doanh Nghiệp",
      shortDescription: "Tổ chức hội nghị chuyên nghiệp cho doanh nghiệp",
      description: "Team building, ra mắt sản phẩm, hội thảo. Thiết bị trình chiếu, âm thanh hiện đại.",
      priceFrom: "20000000",
      priceTo: "200000000",
      guestFrom: 50,
      guestTo: 1000,
      isFeatured: true,
    },
    {
      slug: "le-khai-truong",
      categoryId: catOpening.id,
      title: "Lễ Khai Trương",
      shortDescription: "Khai trương ấn tượng, chuyên nghiệp",
      description: "Cắt băng khánh thành, pháo hoa, văn nghệ chào mừng. Tạo dấu ấn mạnh mẽ cho doanh nghiệp.",
      priceFrom: "10000000",
      priceTo: "80000000",
      guestFrom: 50,
      guestTo: 300,
      isFeatured: true,
    },
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({ where: { slug: s.slug }, update: {}, create: s });
  }
  log(`  ✅ ${servicesData.length} services ready\n`);

  // ── STEP 4: Vendor Categories ─────────────────────────────────────────────

  log("🏪 Vendor Categories");
  const vendorCats = [
    { name: "Catering / Ẩm Thực", slug: "catering" },
    { name: "Trang Trí Sự Kiện", slug: "trang-tri" },
    { name: "Âm Thanh & Ánh Sáng", slug: "am-thanh-anh-sang" },
    { name: "Nhiếp Ảnh & Quay Phim", slug: "nhiep-anh" },
    { name: "Hoa Tươi & Cắm Hoa", slug: "hoa-tuoi" },
    { name: "MC & Biểu Diễn", slug: "mc-bieu-dien" },
  ];
  for (const vc of vendorCats) {
    await prisma.vendorCategory.upsert({
      where: { slug: vc.slug },
      update: {},
      create: vc,
    });
  }
  log(`  ✅ ${vendorCats.length} vendor categories ready\n`);

  // ── STEP 5: Review Criteria ───────────────────────────────────────────────

  log("⭐ Review Criteria");
  const criteriaData = [
    { key: "organization", label: "Tổ chức & Điều phối", sortOrder: 1 },
    { key: "decoration", label: "Trang trí", sortOrder: 2 },
    { key: "catering", label: "Ẩm thực", sortOrder: 3 },
    { key: "service", label: "Thái độ phục vụ", sortOrder: 4 },
    { key: "value", label: "Giá trị cho chi phí", sortOrder: 5 },
  ];
  for (const c of criteriaData) {
    await prisma.reviewCriteria.upsert({
      where: { key: c.key },
      update: {},
      create: c,
    });
  }
  log(`  ✅ ${criteriaData.length} criteria ready\n`);

  // ── STEP 6: Testimonials (chỉ tạo nếu chưa có) ───────────────────────────

  log("💬 Testimonials");
  const testimonialCount = await prisma.testimonial.count();
  if (testimonialCount === 0) {
    await prisma.testimonial.createMany({
      data: [
        {
          customerName: "Nguyễn Thị Hoa",
          roleText: "Cô dâu — Tiệc cưới tháng 3/2025",
          content: "NiChan đã tổ chức đám cưới của chúng tôi hoàn hảo. Mọi chi tiết đều được chú ý tỉ mỉ!",
          rating: 5,
          isFeatured: true,
          isActive: true,
        },
        {
          customerName: "Trần Văn Minh",
          roleText: "CEO — Sự kiện ra mắt sản phẩm",
          content: "Chuyên nghiệp và đúng deadline. Hội nghị của công ty diễn ra suôn sẻ nhờ đội ngũ NiChan.",
          rating: 5,
          isFeatured: true,
          isActive: true,
        },
        {
          customerName: "Lê Thị Thu",
          roleText: "Khách hàng — Tiệc sinh nhật",
          content: "Trang trí đẹp xuất sắc, đồ ăn ngon. Bé nhà tôi rất vui với bữa tiệc sinh nhật!",
          rating: 4,
          isFeatured: true,
          isActive: true,
        },
        {
          customerName: "Phạm Quốc Hùng",
          roleText: "Giám đốc điều hành — Lễ khai trương",
          content: "Rất hài lòng với lễ khai trương của chi nhánh mới. Khách mời đều ấn tượng!",
          rating: 5,
          isFeatured: false,
          isActive: true,
        },
      ],
    });
    log("  ✅ 4 testimonials created");
  } else {
    log(`  ⚠️  Testimonials already exist (${testimonialCount}), skipping`);
  }
  log("");

  // ── STEP 7: Portfolio ─────────────────────────────────────────────────────

  log("🖼️  Portfolio");
  const portfolioCount = await prisma.portfolioItem.count();
  if (portfolioCount === 0) {
    await prisma.portfolioItem.createMany({
      data: [
        {
          title: "Tiệc Cưới Hồng & Nam",
          slug: "tiec-cuoi-hong-nam-2025",
          category: "wedding",
          guestCount: 300,
          coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
          status: "visible",
          publishedAt: new Date("2025-03-15"),
        },
        {
          title: "Hội Nghị FPT 2025",
          slug: "hoi-nghi-fpt-2025",
          category: "conference",
          guestCount: 500,
          coverImageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
          status: "visible",
          publishedAt: new Date("2025-02-10"),
        },
        {
          title: "Lễ Khai Trương Showroom ABC",
          slug: "khai-truong-showroom-abc",
          category: "opening",
          guestCount: 150,
          coverImageUrl: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800",
          status: "visible",
          publishedAt: new Date("2025-01-20"),
        },
        {
          title: "Sinh Nhật Bé Sofia 5 Tuổi",
          slug: "sinh-nhat-be-sofia-5tuoi",
          category: "birthday",
          guestCount: 60,
          coverImageUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800",
          status: "visible",
          publishedAt: new Date("2025-04-01"),
        },
      ],
    });
    log("  ✅ 4 portfolio items created");
  } else {
    log(`  ⚠️  Portfolio already exists (${portfolioCount}), skipping`);
  }
  log("");

  // ── STEP 8: Blog Posts (dùng admin.id đã có từ STEP 1) ───────────────────

  log("📝 Blog Posts");
  const blogCount = await prisma.blogPost.count();
  if (blogCount === 0) {
    await prisma.blogPost.createMany({
      data: [
        {
          title: "5 Xu Hướng Trang Trí Tiệc Cưới 2025",
          slug: "xu-huong-trang-tri-tiec-cuoi-2025",
          category: "wedding",
          excerpt: "Khám phá những xu hướng trang trí đám cưới hiện đại và sang trọng nhất năm 2025.",
          content: "Nội dung bài viết đầy đủ về xu hướng trang trí tiệc cưới...",
          coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
          status: "published",
          publishedAt: new Date("2025-04-01"),
          createdById: admin.id,
        },
        {
          title: "Checklist 30 Ngày Trước Tiệc Cưới",
          slug: "checklist-30-ngay-truoc-tiec-cuoi",
          category: "tips",
          excerpt: "Danh sách những việc cần chuẩn bị trong 30 ngày trước ngày cưới.",
          content: "Nội dung chi tiết về checklist chuẩn bị tiệc cưới...",
          coverImageUrl: "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=800",
          status: "published",
          publishedAt: new Date("2025-03-15"),
          createdById: admin.id,
        },
        {
          title: "Tổ Chức Hội Nghị Doanh Nghiệp Hiệu Quả",
          slug: "to-chuc-hoi-nghi-doanh-nghiep-hieu-qua",
          category: "conference",
          excerpt: "Những bí quyết để tổ chức một hội nghị doanh nghiệp chuyên nghiệp và ấn tượng.",
          content: "Nội dung bài viết về tổ chức hội nghị...",
          coverImageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
          status: "published",
          publishedAt: new Date("2025-02-20"),
          createdById: admin.id,
        },
      ],
    });
    log("  ✅ 3 blog posts created");
  } else {
    log(`  ⚠️  Blog posts already exist (${blogCount}), skipping`);
  }
  log("");

  // ── Done ──────────────────────────────────────────────────────────────────

  log("🎉  Seed completed successfully!\n");
  log("📋  Demo accounts:");
  log("    admin@nichan.vn       / Admin@2026");
  log("    organizer@nichan.vn   / Organizer@2026");
  log("    organizer2@nichan.vn  / Organizer@2026");
  log("    customer@nichan.vn    / Customer@2026\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("\n❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
