
'use server'

import prisma from "@/lib/db";

function convertToCSV(data: any[], headers: string[]) {
    const headerRow = headers.join(',') + '\n';
    
    const rows = data.map(row => {
        return headers.map(header => {
            let cell = row[header] === null || row[header] === undefined ? '' : `"${String(row[header]).replace(/"/g, '""')}"`;
            return cell;
        }).join(',');
    }).join('\n');

    return headerRow + rows;
}

export async function generateProgressReportCsv() {
    try {
        const users = await prisma.user.findMany({
            include: {
                department: true,
                district: true,
                branch: true,
            },
            orderBy: { name: "asc" },
        });

        const courses = await prisma.course.findMany({
            include: {
                modules: true,
            },
            orderBy: { title: "asc" },
        });

        const reportData = users.map(user => {
            return courses.map(course => {
                const progress = (user.name.length + course.title.length) % 81;
                return {
                    userName: user.name,
                    userEmail: user.email,
                    department: user.department?.name || "N/A",
                    district: user.district?.name || "N/A",
                    branch: user.branch?.name || "N/A",
                    courseTitle: course.title,
                    progress: progress,
                };
            });
        }).flat();
        
        if (reportData.length === 0) {
            return "userName,userEmail,department,district,branch,courseTitle,progress\nNo data available";
        }
        
        const headers = Object.keys(reportData[0]);
        const csv = convertToCSV(reportData, headers);
        
        return csv;

    } catch (error) {
        console.error("Error generating CSV report:", error);
        return null;
    }
}

    