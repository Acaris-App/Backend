exports.validateSemesterDocuments = (currentSemester, docs) => {

  for (let i = 1; i < currentSemester; i++) {

    const hasKRS = docs.some(d => d.type === 'krs' && d.semester === i);
    const hasKHS = docs.some(d => d.type === 'khs' && d.semester === i);

    if (!hasKRS || !hasKHS) {
      throw {
        status: 400,
        message: `Dokumen semester ${i} belum lengkap`
      };
    }
  }

  return true;
};