import {
  resolveRecruiterInitials,
  getRecruiterMappings
} from './recruiterMappingService';

/**
 * Process applicant data and replace recruiter initials with UIDs
 * @param {Array} applicantData - Array of applicant records
 * @param {Object} recruiterMappings - Mappings cache (optional, for performance)
 * @returns {Array} - Applicant data with recruiter UIDs resolved
 */
export const resolveApplicantRecruiters = async (applicantData, recruiterMappings = null) => {
  try {
    // Load mappings if not provided
    const mappings = recruiterMappings || await getRecruiterMappings();
    const mappingsArray = Object.values(mappings);

    return await Promise.all(
      applicantData.map(async (applicant) => {
        const processedApplicant = { ...applicant };

        // Check various field names where recruiter might be stored
        const recruiterField = 
          applicant.recruiter ||
          applicant.assignedRecruiter ||
          applicant.recruiterInitials ||
          applicant.recruiterName ||
          '';

        if (recruiterField) {
          // Try to resolve the recruiter initials/name
          const resolvedUid = await resolveRecruiterInitials(recruiterField);

          if (resolvedUid) {
            processedApplicant.assignedRecruiter = resolvedUid;
            // Remove the original field if it was initials
            delete processedApplicant.recruiter;
            delete processedApplicant.recruiterInitials;
          } else {
            // If we can't resolve, keep the original value for manual review
            processedApplicant.recruiterInitials = recruiterField;
            console.warn(`Could not resolve recruiter: ${recruiterField}`);
          }
        }

        return processedApplicant;
      })
    );
  } catch (error) {
    console.error('Error resolving applicant recruiters:', error);
    return applicantData;
  }
};

/**
 * Get unresolved recruiters from applicant data
 * Useful for identifying which initials need mapping
 */
export const getUnresolvedRecruiters = async (applicantData) => {
  try {
    const mappings = await getRecruiterMappings();
    const unresolved = new Set();

    for (const applicant of applicantData) {
      const recruiterField = 
        applicant.recruiter ||
        applicant.assignedRecruiter ||
        applicant.recruiterInitials ||
        applicant.recruiterName ||
        '';

      if (recruiterField) {
        const normalized = recruiterField
          .toUpperCase()
          .replace(/\./g, '')
          .replace(/\s/g, '');

        // Check if this is in the mappings
        const found = Object.values(mappings).some(
          m => m.initials === normalized
        );

        if (!found && normalized) {
          unresolved.add(recruiterField);
        }
      }
    }

    return Array.from(unresolved).sort();
  } catch (error) {
    console.error('Error getting unresolved recruiters:', error);
    return [];
  }
};

/**
 * Create a report of recruiter assignments in applicant data
 */
export const getRecruiterAssignmentReport = async (applicantData) => {
  try {
    const report = {};

    for (const applicant of applicantData) {
      const recruiterField = 
        applicant.recruiter ||
        applicant.assignedRecruiter ||
        applicant.recruiterInitials ||
        applicant.recruiterName ||
        'Unassigned';

      if (!report[recruiterField]) {
        report[recruiterField] = {
          count: 0,
          statuses: {},
          applicants: []
        };
      }

      report[recruiterField].count++;
      report[recruiterField].applicants.push({
        name: applicant.name,
        status: applicant.status
      });

      // Track status breakdown by recruiter
      const status = applicant.status || 'Unknown';
      report[recruiterField].statuses[status] = 
        (report[recruiterField].statuses[status] || 0) + 1;
    }

    return report;
  } catch (error) {
    console.error('Error creating recruiter assignment report:', error);
    return {};
  }
};
