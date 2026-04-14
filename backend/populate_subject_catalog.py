import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import SubjectCatalog

CATALOG = [
    # ── ECE ──
    # Year 1
    ("EC1101", "Engineering Mathematics I",          "ECE", 1, "Odd"),
    ("EC1102", "Engineering Physics",                "ECE", 1, "Odd"),
    ("EC1103", "Engineering Chemistry",              "ECE", 1, "Odd"),
    ("EC1104", "Problem Solving & C Programming",    "ECE", 1, "Odd"),
    ("EC1201", "Engineering Mathematics II",         "ECE", 1, "Even"),
    ("EC1202", "Basic Electrical Engineering",       "ECE", 1, "Even"),
    ("EC1203", "Engineering Graphics",               "ECE", 1, "Even"),
    # Year 2
    ("EC2101", "Circuits and Networks",              "ECE", 2, "Odd"),
    ("EC2102", "Electronic Devices & Circuits",      "ECE", 2, "Odd"),
    ("EC2103", "Digital Electronics",                "ECE", 2, "Odd"),
    ("EC2104", "Signals and Systems",                "ECE", 2, "Odd"),
    ("EC2201", "Analog Integrated Circuits",         "ECE", 2, "Even"),
    ("EC2202", "Electromagnetic Theory",             "ECE", 2, "Even"),
    ("EC2203", "Communication Theory",               "ECE", 2, "Even"),
    # Year 3
    ("EC3101", "VLSI Design",                        "ECE", 3, "Odd"),
    ("EC3102", "Microprocessors & Microcontrollers", "ECE", 3, "Odd"),
    ("EC3103", "Digital Signal Processing",          "ECE", 3, "Odd"),
    ("EC3104", "Wireless Communication",             "ECE", 3, "Odd"),
    ("EC3201", "RF & Microwave Engineering",         "ECE", 3, "Even"),
    ("EC3202", "Satellite Communication",            "ECE", 3, "Even"),
    ("EC3203", "Embedded Systems",                   "ECE", 3, "Even"),
    # Year 4
    ("EC4101", "Optical Communication",              "ECE", 4, "Odd"),
    ("EC4102", "Radar & Navigation Systems",         "ECE", 4, "Odd"),
    ("EC4201", "Project Work Phase I",               "ECE", 4, "Even"),
    ("EC4202", "Entrepreneurship Development",       "ECE", 4, "Even"),

    # ── CSE ──
    # Year 1
    ("CS1101", "Engineering Mathematics I",          "CSE", 1, "Odd"),
    ("CS1102", "Programming in C",                   "CSE", 1, "Odd"),
    ("CS1201", "Engineering Mathematics II",         "CSE", 1, "Even"),
    ("CS1202", "Data Structures",                    "CSE", 1, "Even"),
    # Year 2
    ("CS2101", "Design & Analysis of Algorithms",   "CSE", 2, "Odd"),
    ("CS2102", "Object Oriented Programming",        "CSE", 2, "Odd"),
    ("CS2103", "Computer Organization",              "CSE", 2, "Odd"),
    ("CS2201", "Database Management Systems",        "CSE", 2, "Even"),
    ("CS2202", "Operating Systems",                  "CSE", 2, "Even"),
    ("CS2203", "Computer Networks",                  "CSE", 2, "Even"),
    # Year 3
    ("CS3101", "Compiler Design",                    "CSE", 3, "Odd"),
    ("CS3102", "Software Engineering",               "CSE", 3, "Odd"),
    ("CS3103", "Machine Learning",                   "CSE", 3, "Odd"),
    ("CS3201", "Cloud Computing",                    "CSE", 3, "Even"),
    ("CS3202", "Cyber Security",                     "CSE", 3, "Even"),
    ("CS3203", "Big Data Analytics",                 "CSE", 3, "Even"),
    # Year 4
    ("CS4101", "Distributed Systems",               "CSE", 4, "Odd"),
    ("CS4201", "Project Work",                       "CSE", 4, "Even"),

    # ── IT ──
    ("IT2101", "Web Technologies",                   "IT", 2, "Odd"),
    ("IT2102", "Data Structures",                    "IT", 2, "Odd"),
    ("IT2201", "Database Systems",                   "IT", 2, "Even"),
    ("IT2202", "Computer Networks",                  "IT", 2, "Even"),
    ("IT3101", "Mobile Application Development",    "IT", 3, "Odd"),
    ("IT3102", "Information Security",               "IT", 3, "Odd"),
    ("IT3201", "IoT & Embedded Systems",             "IT", 3, "Even"),
    ("IT3202", "Cloud Architecture",                 "IT", 3, "Even"),

    # ── AI&DS ──
    ("AI3101", "Natural Language Processing",        "AI&DS", 3, "Odd"),
    ("AI3102", "Secure Systems Engineering",         "AI&DS", 3, "Odd"),
    ("AI3103", "Predictive Analytics",               "AI&DS", 3, "Odd"),
    ("AI3201", "Generative AI",                      "AI&DS", 3, "Even"),
    ("AI3202", "Design Thinking & Innovation",       "AI&DS", 3, "Even"),
    ("AI3203", "Problem Solving Techniques",         "AI&DS", 3, "Even"),

    # ── AIML ──
    ("ML3101", "Deep Learning",                      "AIML", 3, "Odd"),
    ("ML3102", "Computer Vision",                    "AIML", 3, "Odd"),
    ("ML3201", "Reinforcement Learning",             "AIML", 3, "Even"),
    ("ML3202", "AI Ethics & Governance",             "AIML", 3, "Even"),

    # ── EEE ──
    ("EE2101", "Electrical Machines",                "EEE", 2, "Odd"),
    ("EE2102", "Power Systems",                      "EEE", 2, "Odd"),
    ("EE2201", "Control Systems",                    "EEE", 2, "Even"),
    ("EE3101", "Power Electronics",                  "EEE", 3, "Odd"),
    ("EE3201", "High Voltage Engineering",           "EEE", 3, "Even"),

    # ── MECH ──
    ("ME2101", "Engineering Thermodynamics",         "MECH", 2, "Odd"),
    ("ME2102", "Fluid Mechanics",                    "MECH", 2, "Odd"),
    ("ME2201", "Manufacturing Technology",           "MECH", 2, "Even"),
    ("ME3101", "Machine Design",                     "MECH", 3, "Odd"),
    ("ME3201", "Finite Element Analysis",            "MECH", 3, "Even"),

    # ── CIVIL ──
    ("CE2101", "Structural Analysis",                "CIVIL", 2, "Odd"),
    ("CE2102", "Soil Mechanics",                     "CIVIL", 2, "Odd"),
    ("CE2201", "Concrete Technology",                "CIVIL", 2, "Even"),
    ("CE3101", "Foundation Engineering",             "CIVIL", 3, "Odd"),
    ("CE3201", "Environmental Engineering",          "CIVIL", 3, "Even"),
]

created = 0
for code, name, dept, year, sem in CATALOG:
    obj, was_created = SubjectCatalog.objects.get_or_create(
        subject_code=code,
        defaults=dict(subject_name=name, department=dept, year=year, semester=sem)
    )
    if was_created:
        created += 1

print(f"Subject Catalog seeded: {created} new subjects added ({SubjectCatalog.objects.count()} total).")
