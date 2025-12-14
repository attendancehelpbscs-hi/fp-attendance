interface SectionsByGrade {
  [key: string]: string[];
}

const SECTIONS_BY_GRADE: SectionsByGrade = {
  '1': [
    'CAMIA',
    'CARNATION',
    'MAGNOLIA',
    'AZUCENA',
    'GUMAMELA',
    'ORCHIDS',
    'SAMPAGUITA',
    'LILAC',
    'IRIS',
    'EDELWEISS',
    'CATTLEYA',
    'DAFFODIL',
    'ASTER',
    'DAHLIA',
    'HIBISCUS',
    'GLADOLIA',
    'BUTTERCUP',
    'DAISY',
    'VIOLETA',
    'LIRIO',
    'TULIP',
    'JASMIN',
    'LILY',
    'SUNFLOWER',
    '(UNNAMED SECTION)'
  ],
  '2': [
    'CAMIA',
    'CARNATION',
    'MAGNOLIA',
    'AZUCENA',
    'GUMAMELA',
    'ORCHIDS',
    'SAMPAGUITA',
    'LILAC',
    'IRIS',
    'EDELWEISS',
    'CATTLEYA',
    'DAFFODIL',
    'ASTER',
    'DAHLIA',
    'HIBISCUS',
    'GLADOLIA',
    'BUTTERCUP',
    'DAISY',
    'VIOLETA',
    'LIRIO',
    'TULIP',
    'JASMIN',
    'LILY',
    'SUNFLOWER',
    '(UNNAMED SECTION)'
  ],
  '3': [
    'CAMIA',
    'CARNATION',
    'MAGNOLIA',
    'AZUCENA',
    'GUMAMELA',
    'ORCHIDS',
    'SAMPAGUITA',
    'LILAC',
    'IRIS',
    'EDELWEISS',
    'CATTLEYA',
    'DAFFODIL',
    'ASTER',
    'DAHLIA',
    'HIBISCUS',
    'GLADOLIA',
    'BUTTERCUP',
    'DAISY',
    'VIOLETA',
    'LIRIO',
    'TULIP',
    'JASMIN',
    'LILY',
    'SUNFLOWER',
    '(UNNAMED SECTION)'
  ],
  '4': [
    'CAMIA',
    'CARNATION',
    'MAGNOLIA',
    'AZUCENA',
    'GUMAMELA',
    'ORCHIDS',
    'SAMPAGUITA',
    'LILAC',
    'IRIS',
    'EDELWEISS',
    'CATTLEYA',
    'DAFFODIL',
    'ASTER',
    'DAHLIA',
    'HIBISCUS',
    'GLADOLIA',
    'BUTTERCUP',
    'DAISY',
    'VIOLETA',
    'LIRIO',
    'TULIP',
    'JASMIN',
    'LILY',
    'SUNFLOWER',
    '(UNNAMED SECTION)'
  ],
  '5': [
    'CAMIA',
    'CARNATION',
    'MAGNOLIA',
    'AZUCENA',
    'GUMAMELA',
    'ORCHIDS',
    'SAMPAGUITA',
    'LILAC',
    'IRIS',
    'EDELWEISS',
    'CATTLEYA',
    'DAFFODIL',
    'ASTER',
    'DAHLIA',
    'HIBISCUS',
    'GLADOLIA',
    'BUTTERCUP',
    'DAISY',
    'VIOLETA',
    'LIRIO',
    'TULIP',
    'JASMIN',
    'LILY',
    'SUNFLOWER',
    '(UNNAMED SECTION)'
  ],
  '6': [
    'CAMIA',
    'CARNATION',
    'MAGNOLIA',
    'AZUCENA',
    'GUMAMELA',
    'ORCHIDS',
    'SAMPAGUITA',
    'LILAC',
    'IRIS',
    'EDELWEISS',
    'CATTLEYA',
    'DAFFODIL',
    'ASTER',
    'DAHLIA',
    'HIBISCUS',
    'GLADOLIA',
    'BUTTERCUP',
    'DAISY',
    'VIOLETA',
    'LIRIO',
    'TULIP',
    'JASMIN',
    'LILY',
    'SUNFLOWER',
    '(UNNAMED SECTION)'
  ]
};

export const getSectionsForGrade = (grade: string): string[] => {
  return SECTIONS_BY_GRADE[grade] || [];
};

export const getAllSections = (): string[] => {
  return Array.from(new Set(Object.values(SECTIONS_BY_GRADE).flat()));
};

export const isSectionValidForGrade = (section: string, grade: string): boolean => {
  const sections = getSectionsForGrade(grade);
  return sections.includes(section);
};

export const isSectionAlreadyAssigned = async (section: string, grade: string, excludeTeacherId?: string): Promise<boolean> => {
  const { prisma } = await import('../db/prisma-client');

  const whereClause: any = {
    section,
    // grade, // Removed to enforce global uniqueness of sections across all grades
    role: 'TEACHER',
    approval_status: { in: ['APPROVED', 'PENDING'] } // Check both APPROVED and PENDING
  };

  if (excludeTeacherId) {
    whereClause.id = { not: excludeTeacherId };
  }

  const existingTeacher = await prisma.staff.findFirst({
    where: whereClause
  });

  return !!existingTeacher;
};

export default SECTIONS_BY_GRADE;