class Manual extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}
	/* 
    Name: main
    Purpose: mutate all the values seen to user by delay of this.state.controls.speed 
    @mutate: this.state.model
  */
	async main() {
		const timer = (ms) => new Promise((res) => setTimeout(res, ms));
		/* Until broken by user */
		while (true) {
			/* Destructure neccesary state */
			const { controls, model } = this.state;
			const { playing, speed } = controls;

			if (playing === false) {
				break;
			}
			await timer(speed);
			/* this.nerualNetwork(model) */
			await this.neuralNetwork();
			this.mutate("model", "epoch", model.epoch + 1);
		}
	}
	async neuralNetwork() {
		/* Add the inputs to the first input neuron */
		await this.forwardModel(this.getRandomInt(this.state.data.X.length));
		await this.backwardModel();
		await this.updateModel();
		// await this.backwardModel(model);
		// await this.updateModel(model);
	}

	/* 
Name: initializeModel
Purpose: to invoke generation of data and initializing the neural network model
@mutate: this.model
*/
	async initializeModel(shape, start, stop, increment, eqn) {
		/* Generate Data and set this.state.data*/
		this.generateData(start, stop, increment, eqn);
		// let newsShape = [0, 1, 3, 3, 1];
		// const numLayers     1  2  3  4 = 4
		let newShape = [0, ...shape];
		const numLayers = newShape.length;

		/* Define the model */
		/* [[neuron], [neuron, neuron, neuron],[neuron, neuron, neuron], [neuron]] model: [1,3,3,1] shape */
		let model = [];

		/* Add input neuron to the model */
		for (let i = 1; i < numLayers; i++) {
			/* Initialize layer */
			let layer = [];
			/* Get the number of neurons to generate */
			let numNeurons = newShape[i];
			/* Add neurons to the to the layer */
			for (let e = 0; e < numNeurons; e++) {
				/* Number of inputs from the previous layer to devlay Neuron */
				let neuron = this.initDenseNeuron(newShape[i - 1]);
				/* Push to layer */
				layer.push(neuron);
			}
			/* Add to the model */
			model.push(layer);
		}

		/* update the state */
		this.mutate("model", "neurons", model);
		this.mutate("model", "shape", shape);
	}

	/* 
Name: initDenseNeuron
@param: numInputs
@return: intialized neuron object 
*/
	initDenseNeuron(numInputs) {
		let DenseNeuronTemplate = {
			forward: {
				inputs: [],
				weights: [],
				bias: null,
				product: [],
				sum: null,
				activation: null,
				output: null,
			},
			backward: {
				dvalue: null,
				dReLU: null,
				dBias: null,
				dMult: [],
				dWeights: [],
				dInputs: [],
				dNeuron: null,
			},
			links: [],
		};
		for (let i = 0; i < numInputs; i++) {
			let number =
				0.1 * (Math.random() < 0.5 ? -Math.random() : Math.random());
			//let number = Math.random();
			DenseNeuronTemplate.forward.weights.push(number);
		}
		DenseNeuronTemplate.forward.bias = 0;
		DenseNeuronTemplate.links = this.linkModel(numInputs);

		return DenseNeuronTemplate;
	}

	linkModel(numInputs) {
		return this.linearData(0, numInputs - 1, 1);
	}

	/* 
Name: forwardModel
Purpose: one forward pass 
@mutate: this.model
*/
	async forwardModel(index) {
		/* Destructure State */
		const { data, model } = this.state;
		const { neurons, shape } = model;

		//const index = 1;
		let X = [data.X[index]];
		this.setInputs(X, 0);
		/* First perform one forward pass */
		/* iterate non-input layers */
		let io = X;
		for (let layer = 1; layer < shape.length; layer++) {
			/* Pass the values from the last neuron */
			this.setInputs(io, layer);
			io = [];
			/* iterate neuron */
			for (let neuron = 0; neuron < shape[layer]; neuron++) {
				let { weights, inputs, bias } = neurons[layer][neuron].forward;
				let mult = this.mult(weights, inputs);
				let sum = this.sum(mult) + bias;
				if (layer != shape.length - 1) {
					let relu = this.ReLU(sum);
				}
				let relu = sum;
				this.mutateModelNeurons(
					"forward",
					"product",
					mult,
					layer,
					neuron
				);
				this.mutateModelNeurons("forward", "sum", sum, layer, neuron);
				this.mutateModelNeurons(
					"forward",
					"activation",
					relu,
					layer,
					neuron
				);
				this.mutateModelNeurons(
					"forward",
					"output",
					relu,
					layer,
					neuron
				);
				io.push(relu);
			}
		}
		/* Calculate loss */
		const yhat = this.state.model.neurons[shape.length - 1][0].forward
			.output;
		let loss = this.mseLoss(yhat, data.y[index]);
		this.mutate("model", "y", data.y[index]);
		this.mutate("model", "yhat", yhat);
		this.mutate("model", "loss", loss);

		//console.log(`yhat: ${this.state.model.yhat}`);
		//console.log(`y: ${this.state.data.y[index]}`);
		//console.log(this.state.model.loss);
	}

	/* 
	Name: mutateAllBackward
	@mutate: this.model.neurons[layer][neuron].backward
*/
	mutateAllBackward(
		dReLU,
		dBias,
		dMult,
		dWeights,
		dInputs,
		dNeuron,
		layer,
		neuron
	) {
		this.mutateModelNeurons("backward", "dReLU", dReLU, layer, neuron);
		this.mutateModelNeurons("backward", "dBias", dBias, layer, neuron);
		this.mutateModelNeurons("backward", "dMult", dMult, layer, neuron);
		this.mutateModelNeurons(
			"backward",
			"dWeights",
			dWeights,
			layer,
			neuron
		);
		this.mutateModelNeurons("backward", "dInputs", dInputs, layer, neuron);
		this.mutateModelNeurons("backward", "dNeuron", dNeuron, layer, neuron);
	}

	passBack(dvalue, currentLayer) {
		const { shape } = this.state.model;
		const prevLayer = currentLayer - 1;
		for (let neuron = 0; neuron < shape[prevLayer]; neuron++) {
			this.mutateModelNeurons(
				"backward",
				"dvalue",
				dvalue,
				prevLayer,
				neuron
			);
		}
	}
	/* 
Name: backwardModel
Purpose: compute derivative backwards
@mutate: this.model
*/
	async backwardModel() {
		/* Destructure the state */
		const { model } = this.state;

		/* Destructure model */
		const { yhat, y, shape } = model;

		let outputLayerIndex = shape.length - 1;
		/* Calculate the loss derivative and pass it to the output neuron */
		let dyhat = this.mseDerivative(yhat, y);
		this.mutateModelNeurons(
			"backward",
			"dvalue",
			dyhat,
			outputLayerIndex,
			0
		);

		/* calculate each layer until we hit the layer before input layer */
		for (let layer = outputLayerIndex; layer > 0; layer--) {
			let dNeurons = [];
			let dNeuronsSum = 0;
			for (let neuron = 0; neuron < shape[layer]; neuron++) {
				/* Destructure neccesary items from model forward and backward per neuron */
				let { backward, forward } = model.neurons[layer][neuron];
				let { inputs, weights, activation } = forward;
				let { dvalue } = backward;

				let dReLU = Math.max(0, activation) * dvalue;
				let dBias = dReLU;
				if (layer == outputLayerIndex) {
					dReLU = dvalue;
				}
				let dMult = inputs.map(() => dReLU);
				let dWeights = this.mult(inputs, dMult);
				let dInputs = this.mult(weights, dMult);
				let dNeuron = this.sum(dInputs);

				/* Add all to the state of the neuron */
				this.mutateAllBackward(
					dReLU,
					dBias,
					dMult,
					dWeights,
					dInputs,
					dNeuron,
					layer,
					neuron
				);

				/* Then we want to add dNeuron to an array */
				dNeurons.push(dNeuron);
				//console.log(`Layer: ${layer}, Neuron: ${neuron}`);
				//console.log(backward);
				//console.log(forward);
			}
			/* Sum the dNeuron array */
			dNeuronsSum = this.sum(dNeurons);
			/* Pass back the sum to the next layer */
			this.passBack(dNeuronsSum, layer);
		}
		//console.log(this.state.model.neurons);

		/* Given current layer I want to pass back to previous layer */
		//this.passBack(dvalue, layer);
		//console.log(neurons[layer - 1]);

		///* Start at last layer */
		//for(let layer = shape.length - 1; layer >= 0; layer-- )
		//{
		//let dNeuronArray = [];
		//let dvalueSumLayer = 0;
		///* Itererate through each neuron per layer */
		//for(let neuron = 0; neuron < shape[layer]; neuron++) {
		///* Destructure Neuron */
		//let { activation, weights, inputs } = neurons[layer][neuron].forward;
		//let inputLength = inputs.length;

		//}
		//}

		///* Destructure Neuron */
		//let { activation, weights, inputs } = neurons[layer][neuron].forward;
		//let inputLength = inputs.length;

		//let lastNeuron = neurons[layer][neuron];
		///* Calculate the loss derivative */
		//let dyhat = this.mseDerivative(yhat, y);

		///* Sum the values needed to pass back */
		//let dNeuronArray = [];
		//let dvalueNextLayer = 0;

		///* Pass the value back*/
		//let dvalue = dyhat;
		//let dReLU = Math.max(0, activation) * dvalue;
		//let dBias = dReLU;
		//let dMult = inputs.map(() => dReLU);
		//let dWeights = this.mult(inputs, dMult);
		//let dInputs = this.mult(weights, dMult);
		//let dNeuron = this.sum(dInputs);
		///* Add dNeuron to the layers output */
		//dNeuronArray.push(dNeuron);

		///* At the end of first loop of layer iteration */
		//dvalueNextLayer = this.sum(dNeuronArray);

		//console.log(lastNeuron);
		///* Pass the derivative input back */
		//this.mutateAllBackward(
		//dvalue,
		//dReLU,
		//dBias,
		//dMult,
		//dWeights,
		//dInputs,
		//dNeuron,
		//layer,
		//neuron
		//);
		/* Update all of the parameters */
		//console.log(`dinput: ${dvalue}`);
		//console.log(`Activation: ${activation}`);
		//console.log(`dReLU: ${dReLU}`);
		//console.log(`DBias: ${dBias}`);
		//console.log(`DMult: [${dMult.toString()}]`);
		//console.log(`Dweights: [${dWeights.toString()}]`);
		//console.log(`Dinputs: [${dInputs.toString()}]`);
		//this.mutateModelNeurons(
		//"backward",
		//"dprevNeurondLoss",
		//dlossdyhat,
		//shape.length - 1,
		//0
		//);

		/* Pass back to neurons based on linkage */
		/* We want to now pass it back to the last neuron */

		/* Compute Derivative of loss */
		/* Iterate backwards of neurons */
		/* Compute derivative of a neuron */
		/* print the derivatives */
	}

	gradientDescent(lr, param, dparam) {
		return param - lr * dparam;
	}
	/* 
Name: updateModel
Purpose: to perform gradient descent and update the weights
@mutate: this.model
*/
	async updateModel() {
		/* Destructuring the state */
		const { model } = this.state;

		const { shape, lr, neurons } = model;
		/* Use the derivatives to perform gradient descent */
		/* Iterate through each and subtract weights by itself times the derivative of weights or biases */
		for (let layer = 1; layer < shape.length; layer++) {
			for (let neuron = 0; neuron < shape[layer]; neuron++) {
				let { weights, bias } = neurons[layer][neuron].forward;
				let { dWeights, dBias } = neurons[layer][neuron].backward;
				//*  */console.log(`Layer ${layer}, Neuron: ${neuron}`);
				/* Update weights */
				let updatedWeights = [];
				for (let weight = 0; weight < shape[layer - 1]; weight++) {
					updatedWeights.push(
						this.gradientDescent(
							lr,
							weights[weight],
							dWeights[weight]
						)
					);
				}
				/* Update bias */
				let updatedBias = this.gradientDescent(lr, bias, dBias);

				/* Update the model weights and biases */
				this.mutateModelNeurons(
					"forward",
					"weights",
					updatedWeights,
					layer,
					neuron
				);
				this.mutateModelNeurons(
					"forward",
					"bias",
					updatedBias,
					layer,
					neuron
				);
			}
		}
		/* We want to start from the beginning and subt */
	}
	/* 
Name: setInputs
@param: inputs
@param: currentLayer
@mutate: this.state.model.neurons[currentLayer]
*/
	setInputs(inputs, currentLayer) {
		/* Destructure the neurons */
		const { neurons } = this.state.model;
		/* Iterate through each neuron and set its inputs */
		for (let i = 0; i < neurons[currentLayer].length; i++) {
			this.mutateModelNeurons(
				"forward",
				"inputs",
				inputs,
				currentLayer,
				i
			);
		}
	}

	/* 
Name: generateData
@param: start
@param: end
@param increment
@param: equation (a function the user passes in)
@mutate: this.data
*/
	generateData(start, stop, increment, equation) {
		if (typeof equation === "function" && equation(start) !== undefined) {
			/* Create the X input data */
			const X = this.linearData(start, stop, increment);
			/* Create the labels to the input data */
			const y = X.map((input) => {
				return equation(input).toFixed(3);
			});
			/* Set State */
			this.mutate("data", "X", X);
			this.mutate("data", "y", y);
		} else {
			console.error(
				"Enter a valid equation: must be function with input parameter that returns a number"
			);
		}
	}

	/* 
Name: linearData
@param: start
@param: end
@param increment
@return: output array
*/
	linearData(start, end, increment) {
		let output = [];
		for (let i = start; i <= end; i += increment) {
			output.push(i);
		}
		return output;
	}
	/* 
    Name: mutateModelNeurons
    @param key: corresponds to this.state.key
    @param subkey: corresponds to this.state.key.subkey
    @param value
    @param layer
    @param neuron
    @mutate: this.state.key.subkey with value
  */
	mutateModelNeurons(key, subkey, value, layer, neuron) {
		/* copy of the state */
		let neurons = { ...this.state.model.neurons };
		/* If this.state.key.subkey exists */
		if (neurons[layer][neuron][key][subkey] !== undefined) {
			/* Mutate the state */
			neurons[layer][neuron][key][subkey] = value;
			this.setState({
				...this.state,
				model: { ...this.state.model, neurons: neurons },
			});
		} else {
			console.error("Could not be found in state");
		}
	}
	predicitons() {
		const { data } = this.state;
		for (let i = 0; i < data.X.length; i++) {
			this.forwardModel();
		}
	}
	render() {
		return <div></div>;
	}
}

export default Manual;
