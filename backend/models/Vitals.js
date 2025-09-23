const mongoose = require('mongoose');

const vitalsSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
        index: true
    },
    uhid: {
        type: String,
        required: true,
        index: true
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    recordedByName: {
        type: String,
        required: true
    },
    recordedByRole: {
        type: String,
        required: true
    },
    clinicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic',
        required: [true, 'Clinic ID is required']
    },
    visitDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    
    // Vital Signs
    vitalSigns: {
        height: {
            value: { type: Number, min: 0, max: 300 }, // in cm
            unit: { type: String, default: 'cm' }
        },
        weight: {
            value: { type: Number, min: 0, max: 500 }, // in kg
            unit: { type: String, default: 'kg' }
        },
        bmi: {
            value: { type: Number, min: 0, max: 100 }, // auto-calculated
            category: { type: String, enum: ['Underweight', 'Normal', 'Overweight', 'Obese'] }
        },
        bloodPressure: {
            systolic: { type: Number, min: 50, max: 300 },
            diastolic: { type: Number, min: 30, max: 200 },
            unit: { type: String, default: 'mmHg' }
        },
        heartRate: {
            value: { type: Number, min: 30, max: 200 }, // bpm
            unit: { type: String, default: 'bpm' }
        },
        respiratoryRate: {
            value: { type: Number, min: 8, max: 60 }, // breaths per minute
            unit: { type: String, default: 'breaths/min' }
        },
        temperature: {
            value: { type: Number, min: 30, max: 45 }, // in Celsius
            unit: { type: String, default: '°C' }
        },
        oxygenSaturation: {
            value: { type: Number, min: 70, max: 100 }, // SpO2 percentage
            unit: { type: String, default: '%' }
        }
    },

    // Clinical Notes
    clinicalNotes: {
        chiefComplaint: {
            complaint: String,
            duration: String
        },
        allergies: {
            drug: [String],
            food: [String],
            environment: [String]
        },
        currentMedications: [{
            name: String,
            dosage: String,
            frequency: String
        }],
        recentHospitalizations: [{
            date: Date,
            reason: String,
            hospital: String
        }],
        pastMedicalHistory: {
            chronicIllnesses: [String],
            surgeries: [{
                procedure: String,
                date: Date,
                hospital: String
            }],
            hospitalizations: [{
                date: Date,
                reason: String,
                duration: String
            }]
        },
        familyMedicalHistory: {
            diabetes: { type: Boolean, default: false },
            hypertension: { type: Boolean, default: false },
            heartDisease: { type: Boolean, default: false },
            cancer: { type: Boolean, default: false },
            other: [String]
        },
        immunizationStatus: {
            upToDate: { type: Boolean, default: false },
            lastUpdated: Date,
            notes: String
        },
        lifestyleHabits: {
            general: String 
        },
        nurseObservations: {
            generalAppearance: String,
            specialRemarks: String,
            additionalNotes: String
        }
    },

    // Metadata
    isPreConsultation: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['Draft', 'Completed', 'Reviewed'],
        default: 'Draft'
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
vitalsSchema.index({ patientId: 1, visitDate: -1 });
vitalsSchema.index({ uhid: 1, visitDate: -1 });
vitalsSchema.index({ visitDate: -1 });

// Pre-save middleware to calculate BMI
vitalsSchema.pre('save', function(next) {
    if (this.vitalSigns.height?.value && this.vitalSigns.weight?.value) {
        const heightInM = this.vitalSigns.height.value / 100; // convert cm to m
        const bmi = this.vitalSigns.weight.value / (heightInM * heightInM);
        
        this.vitalSigns.bmi.value = Math.round(bmi * 10) / 10; // round to 1 decimal
        
        // Determine BMI category
        if (bmi < 18.5) {
            this.vitalSigns.bmi.category = 'Underweight';
        } else if (bmi < 25) {
            this.vitalSigns.bmi.category = 'Normal';
        } else if (bmi < 30) {
            this.vitalSigns.bmi.category = 'Overweight';
        } else {
            this.vitalSigns.bmi.category = 'Obese';
        }
    }
    next();
});

module.exports = mongoose.model('Vitals', vitalsSchema);
