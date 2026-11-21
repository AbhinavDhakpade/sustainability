"""Starter set of SASB industry standards (selected disclosure topics & metrics).

Codes follow the SASB naming pattern. Extend this list with any industry you need:
each metric has code, name, category (disclosure topic), unit and type.
"""

def m(code, name, category, unit, type_="quantitative"):
    return {"code": code, "name": name, "category": category, "unit": unit, "type": type_}


SASB_INDUSTRIES = [
    {
        "id": "FB-AG", "name": "Agricultural Products",
        "metrics": [
            m("FB-AG-110a.1", "Gross global Scope 1 emissions", "Greenhouse Gas Emissions", "t CO2e"),
            m("FB-AG-110a.2", "Long-term and short-term strategy to manage Scope 1 emissions", "Greenhouse Gas Emissions", "narrative", "discussion"),
            m("FB-AG-130a.1", "Total energy consumed", "Energy Management", "GJ"),
            m("FB-AG-130a.1b", "Percentage renewable energy", "Energy Management", "%"),
            m("FB-AG-140a.1", "Total water withdrawn", "Water Management", "thousand m³"),
            m("FB-AG-140a.1b", "Total water consumed", "Water Management", "thousand m³"),
            m("FB-AG-140a.2", "Water management risks and mitigation strategies", "Water Management", "narrative", "discussion"),
            m("FB-AG-250a.1", "GFSI food safety audit non-conformance rate", "Food Safety", "rate"),
            m("FB-AG-320a.1", "Total recordable incident rate (TRIR)", "Workforce Health & Safety", "rate"),
            m("FB-AG-430a.1", "Percentage of agricultural products sourced that are certified", "Environmental & Social Impacts of Ingredient Supply Chains", "%"),
            m("FB-AG-440a.1", "Identification of principal crops and climate-related risks", "Ingredient Sourcing", "narrative", "discussion"),
        ],
    },
    {
        "id": "FB-PF", "name": "Processed Foods",
        "metrics": [
            m("FB-PF-130a.1", "Total energy consumed", "Energy Management", "GJ"),
            m("FB-PF-140a.1", "Total water withdrawn", "Water Management", "thousand m³"),
            m("FB-PF-250a.1", "GFSI audit non-conformance rate", "Food Safety", "rate"),
            m("FB-PF-260a.1", "Revenue from products labelled to promote health attributes", "Health & Nutrition", "currency"),
            m("FB-PF-410a.1", "Percentage of packaging from recycled or renewable materials", "Product Lifecycle Management", "%"),
            m("FB-PF-440a.1", "Percentage of food ingredients sourced from water-stressed regions", "Ingredient Sourcing", "%"),
        ],
    },
    {
        "id": "RR-ST", "name": "Solar Technology & Project Developers",
        "metrics": [
            m("RR-ST-130a.1", "Total energy consumed", "Energy Management in Manufacturing", "GJ"),
            m("RR-ST-140a.1", "Total water withdrawn", "Water Management in Manufacturing", "thousand m³"),
            m("RR-ST-150a.1", "Amount of hazardous waste generated", "Hazardous Waste Management", "t"),
            m("RR-ST-160a.1", "Number and duration of project delays related to ecological impacts", "Ecological Impacts of Project Development", "number"),
            m("RR-ST-410a.1", "Percentage of products sold that are recyclable or reusable", "Product End-of-life Management", "%"),
            m("RR-ST-440a.1", "Management of risks associated with critical materials", "Materials Sourcing", "narrative", "discussion"),
        ],
    },
    {
        "id": "EM-CM", "name": "Construction Materials",
        "metrics": [
            m("EM-CM-110a.1", "Gross global Scope 1 emissions", "Greenhouse Gas Emissions", "t CO2e"),
            m("EM-CM-120a.1", "Air emissions: NOx, SOx, particulate matter", "Air Quality", "t"),
            m("EM-CM-130a.1", "Total energy consumed", "Energy Management", "GJ"),
            m("EM-CM-140a.1", "Total fresh water withdrawn", "Water Management", "thousand m³"),
            m("EM-CM-150a.1", "Amount of waste generated", "Waste Management", "t"),
            m("EM-CM-320a.1", "Total recordable incident rate (TRIR)", "Workforce Health & Safety", "rate"),
        ],
    },
    {
        "id": "CG-AA", "name": "Apparel, Accessories & Footwear",
        "metrics": [
            m("CG-AA-250a.1", "Discussion of processes to maintain compliance with restricted substances", "Management of Chemicals in Products", "narrative", "discussion"),
            m("CG-AA-430a.1", "Percentage of Tier 1 supplier facilities that completed environmental assessment", "Environmental Impacts in the Supply Chain", "%"),
            m("CG-AA-430b.1", "Percentage of Tier 1 supplier facilities audited to a labour code of conduct", "Labour Conditions in the Supply Chain", "%"),
            m("CG-AA-440a.3", "Amount of priority raw materials purchased", "Raw Materials Sourcing", "t"),
        ],
    },
    {
        "id": "TC-SI", "name": "Software & IT Services",
        "metrics": [
            m("TC-SI-130a.1", "Total energy consumed", "Environmental Footprint of Hardware Infrastructure", "GJ"),
            m("TC-SI-130a.2", "Total water withdrawn", "Environmental Footprint of Hardware Infrastructure", "thousand m³"),
            m("TC-SI-220a.1", "Description of policies relating to behavioural advertising and user privacy", "Data Privacy & Freedom of Expression", "narrative", "discussion"),
            m("TC-SI-230a.1", "Number of data breaches", "Data Security", "number"),
            m("TC-SI-330a.1", "Percentage of employees that are foreign nationals", "Recruiting & Managing a Global Workforce", "%"),
            m("TC-SI-330a.3", "Percentage of gender and racial/ethnic group representation", "Recruiting & Managing a Global Workforce", "%"),
        ],
    },
]

SASB_BY_ID = {i["id"]: i for i in SASB_INDUSTRIES}
